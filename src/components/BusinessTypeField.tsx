"use client";

// ─────────────────────────────────────────────────────────────────────────────
//  Campo de tipo de negocio: un buscador, no un desplegable.
//
//  El catálogo pasó de 6 entradas a 27 (`business-types.ts`) y una lista nativa
//  de 27 líneas se recorre a dedo. Aquí se escribe y se filtra por etiqueta y
//  por sinónimo dominicano: "salto" encuentra Cascada y "airbnb" encuentra
//  Hotel. Lo que no encuentra nada se guarda como `otro` con su texto, que es
//  como nos enteramos de qué tipos le faltan al catálogo.
//
//  El panel va siempre en claro aunque el formulario esté sobre tinta, igual
//  que hacía el desplegable nativo al que sustituye (que por eso pintaba sus
//  `<option>` en tinta a mano): un menú es una superficie, no parte del campo.
//
//  No guarda estado en el formulario padre: publica lo elegido en dos inputs
//  ocultos, `businessType` y `businessTypeOther`, y el `FormData` del submit
//  los recoge como a cualquier otro campo.
// ─────────────────────────────────────────────────────────────────────────────

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";

import Icon from "@/components/Icon";
import {
  BUSINESS_TYPE_OTHER_MAX,
  OTHER_BUSINESS_TYPE,
  businessTypeLabel,
  resolveBusinessType,
  searchBusinessTypes,
  type BusinessType,
} from "@/lib/waitlist/business-types";

/** Lo elegido. `other` lleva el texto tal cual lo escribieron. */
type Choice =
  | { kind: "none" }
  | { kind: "catalog"; slug: BusinessType }
  | { kind: "other"; text: string };

/** Una fila del panel: un tipo del catálogo o la salida por texto libre. */
type Option =
  | { kind: "catalog"; slug: BusinessType; label: string; alias?: string }
  | { kind: "other"; text: string };

interface RenderGroup {
  key: string;
  label: string;
  /** El índice es absoluto dentro de `options`, para navegar con el teclado. */
  rows: { index: number; option: Extract<Option, { kind: "catalog" }> }[];
}

export interface BusinessTypeFieldProps {
  /** Clases del campo, ya compuestas por el formulario según su tono. */
  fieldClassName: string;
  /** Color del texto secundario del tono: los iconos y la línea de ayuda. */
  mutedClassName: string;
  /** Clases del texto de error del formulario. */
  errorClassName: string;
  error?: string;
}

export default function BusinessTypeField({
  fieldClassName,
  mutedClassName,
  errorClassName,
  error,
}: BusinessTypeFieldProps) {
  const uid = useId();
  const listId = `${uid}-list`;
  const inputRef = useRef<HTMLInputElement>(null);
  const activeRef = useRef<HTMLLIElement>(null);

  const [query, setQuery] = useState("");
  const [choice, setChoice] = useState<Choice>({ kind: "none" });
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);

  const { groups, options, other } = useMemo(() => {
    const found = searchBusinessTypes(query);
    const options: Option[] = [];
    const groups: RenderGroup[] = found.map((group) => ({
      key: group.key,
      label: group.label,
      rows: group.matches.map((match) => {
        const option = {
          kind: "catalog",
          slug: match.slug,
          label: match.label,
          alias: match.alias,
        } as const;
        options.push(option);
        return { index: options.length - 1, option };
      }),
    }));

    // La salida por texto libre sólo aparece cuando no hay nada que elegir:
    // ofrecerla junto a resultados es ruido.
    const text = query.trim();
    const other = !options.length && text ? ({ kind: "other", text } as const) : null;
    if (other) options.push(other);

    return { groups, options, other };
  }, [query]);

  const choose = useCallback((option: Option) => {
    setChoice(
      option.kind === "catalog"
        ? { kind: "catalog", slug: option.slug }
        : { kind: "other", text: option.text }
    );
    setQuery(option.kind === "catalog" ? option.label : option.text);
    setOpen(false);
    setActive(0);
  }, []);

  /**
   * Cierra el campo con lo que haya escrito sin elegir de la lista. Escribir
   * "colmadon" y saltar al siguiente campo tiene que valer lo mismo que
   * elegirlo: si lo escrito ES una etiqueta o un sinónimo, resuelve a su tipo.
   */
  const commitTyped = useCallback(() => {
    setOpen(false);
    const text = query.trim();
    if (!text) {
      setChoice({ kind: "none" });
      setQuery("");
      return;
    }
    const slug = resolveBusinessType(text);
    if (slug) {
      setChoice({ kind: "catalog", slug });
      setQuery(businessTypeLabel(slug));
      return;
    }
    setChoice({ kind: "other", text });
  }, [query]);

  const clear = useCallback(() => {
    setChoice({ kind: "none" });
    setQuery("");
    setActive(0);
    setOpen(true);
    inputRef.current?.focus();
  }, []);

  // La opción activa tiene que verse: con el catálogo entero abierto, bajar con
  // el teclado la saca del alto máximo del panel.
  useEffect(() => {
    if (open) activeRef.current?.scrollIntoView({ block: "nearest" });
  }, [open, active]);

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!open) {
        setOpen(true);
        return;
      }
      if (!options.length) return;
      const step = event.key === "ArrowDown" ? 1 : options.length - 1;
      setActive((i) => (i + step) % options.length);
      return;
    }
    if (event.key === "Enter" && open && options[active]) {
      // Sin esto el Enter que elige un tipo envía además el formulario.
      event.preventDefault();
      choose(options[active]);
      return;
    }
    if (event.key === "Escape" && open) {
      event.preventDefault();
      setOpen(false);
    }
  }

  const hasChoice = choice.kind !== "none";
  const optionId = (index: number) => `${uid}-opt-${index}`;
  const errorId = `${uid}-error`;

  return (
    <div>
      <div className="relative">
        <span
          aria-hidden="true"
          className={`pointer-events-none absolute left-3 top-0 flex h-12 items-center ${mutedClassName}`}
        >
          <Icon name="search" className="text-lg" />
        </span>

        <input
          ref={inputRef}
          type="text"
          role="combobox"
          autoComplete="off"
          maxLength={BUSINESS_TYPE_OTHER_MAX}
          aria-label="Tipo de negocio o lugar"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={open && options[active] ? optionId(active) : undefined}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
          placeholder="Tipo de negocio o lugar"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setChoice({ kind: "none" });
            setActive(0);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={commitTyped}
          onKeyDown={onKeyDown}
          className={`${fieldClassName} pl-9 pr-10`}
        />

        <button
          type="button"
          // Mismo botón, dos trabajos según el estado, como cualquier combobox:
          // sin nada elegido abre la lista, con algo elegido lo borra.
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            if (hasChoice) clear();
            else {
              setOpen((v) => !v);
              inputRef.current?.focus();
            }
          }}
          aria-label={hasChoice ? "Borrar el tipo elegido" : "Ver todos los tipos"}
          className={`absolute right-1 top-0 flex h-12 w-9 cursor-pointer items-center justify-center border-none bg-transparent ${mutedClassName}`}
        >
          <Icon name={hasChoice ? "close" : "expand_more"} className="text-lg" />
        </button>

        {open && (
          <ul
            id={listId}
            role="listbox"
            aria-label="Tipos de negocio o lugar"
            className="absolute left-0 right-0 top-[calc(100%+6px)] z-20 max-h-[16.5rem] min-w-[14rem] overflow-y-auto overscroll-contain rounded-block border border-line bg-paper py-1.5 shadow-e1"
          >
            {groups.map((group) => (
              <li key={group.key} role="group" aria-label={group.label}>
                <p className="px-3.5 pb-0.5 pt-2 font-label text-[11px] font-bold uppercase tracking-[0.09em] text-muted">
                  {group.label}
                </p>
                <ul>
                  {group.rows.map(({ index, option }) => (
                    <li
                      key={option.slug}
                      ref={index === active ? activeRef : undefined}
                      id={optionId(index)}
                      role="option"
                      aria-selected={index === active}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => choose(option)}
                      onMouseEnter={() => setActive(index)}
                      className={`flex min-h-11 cursor-pointer items-center gap-2 px-3.5 py-2 text-body text-ink ${
                        index === active ? "bg-cream" : ""
                      }`}
                    >
                      {option.label}
                      {/* Por qué salió este resultado: se buscó "salto" y esto
                          es Cascada. Sin la pista el match parece un error. */}
                      {option.alias && (
                        <span className="ml-auto shrink-0 rounded-full bg-coral-soft px-2 py-0.5 text-tiny text-coral-ink">
                          {option.alias}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </li>
            ))}

            {other && (
              <li
                ref={activeRef}
                id={optionId(options.length - 1)}
                role="option"
                aria-selected={true}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => choose(other)}
                className="flex min-h-11 cursor-pointer items-center gap-2 px-3.5 py-2 text-body font-bold text-coral-ink"
              >
                <Icon name="add_business" className="shrink-0 text-lg" />
                Usar &ldquo;{other.text}&rdquo; como tipo
              </li>
            )}
          </ul>
        )}
      </div>

      <input type="hidden" name="businessType" value={businessTypeValue(choice)} />
      <input type="hidden" name="businessTypeOther" value={choice.kind === "other" ? choice.text : ""} />

      {error ? (
        <p id={errorId} className={`mx-0.5 mt-[5px] text-tiny ${errorClassName}`}>
          {error}
        </p>
      ) : (
        choice.kind === "other" && (
          <p className={`mx-0.5 mt-[5px] text-tiny ${mutedClassName}`}>
            No está en nuestra lista: lo guardamos como Otro.
          </p>
        )
      )}
    </div>
  );
}

function businessTypeValue(choice: Choice): string {
  if (choice.kind === "none") return "";
  return choice.kind === "catalog" ? choice.slug : OTHER_BUSINESS_TYPE;
}
