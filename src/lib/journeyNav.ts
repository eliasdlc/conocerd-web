// Navegación entre escenas del journey.
//
// Los enlaces del nav/footer apuntan a `trigger-<escena>`. Todos pasan por el
// "saltador" que el recorrido registra aquí, y que anima con el motor de pasos
// hasta el keyframe de esa escena. El fallback por id queda para anclas fuera
// del recorrido.

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
