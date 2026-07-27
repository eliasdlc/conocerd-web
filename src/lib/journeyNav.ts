// Navegación entre escenas del journey.
//
// Los enlaces del nav/footer apuntan a `trigger-<escena>`. En desktop esos
// anchors existen (son la pista de scroll); en móvil no hay pista, así que el
// journey registra aquí un "saltador" y los mismos enlaces siguen funcionando.

type SceneJumper = (scene: string) => boolean;

let jumper: SceneJumper | null = null;

export function registerSceneJumper(fn: SceneJumper) {
  jumper = fn;
  return () => {
    if (jumper === fn) jumper = null;
  };
}

const PREFIX = "trigger-";

export function scrollToSection(id: string) {
  if (id.startsWith(PREFIX) && jumper?.(id.slice(PREFIX.length))) return;

  const el = document.getElementById(id);
  if (el) {
    window.scrollTo({
      top: el.getBoundingClientRect().top + window.scrollY - 64,
      behavior: "smooth",
    });
  }
}

/** Sale del journey hacia el pie de página (último paso en móvil). */
export function scrollToFooter() {
  const el = document.querySelector("footer");
  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
}
