import { ExternalLink } from "lucide-react";
import { SOURCE_LINKS, SOURCE_LOGOS } from "@/types/sourceVars";
import Image from "next/image";

export default function AboutPage() {
    const LOGO_SIZE = 64
  return (
    <section className="mx-auto max-w-3xl px-4 py-12 text-[var(--foreground)] space-y-6">
      <h1 className="text-3xl font-bold">Sobre esta página</h1>

      <p>
        Esta página nació de una necesidad muy simple: quería una forma más cómoda y rápida de
        ver los animes más recientes sin tener que visitar tres sitios diferentes todos los días.
        Me la pasaba revisando <strong>AnimeFLV</strong>, <strong>AnimeAV1</strong> y <strong>OtakusTV</strong>  para 
        ver qué nuevo episodio había salido, y pensé… ¿por qué no juntar todo eso en un solo lugar?
      </p>

      <p>
        Así que este proyecto es eso: un visor unificado que hace <strong>scraping</strong> (sí, recolección automática)
        de esas tres páginas para mostrarte los últimos animes agregados, todo junto y ordenado.
        No usamos APIs oficiales, ni bases de datos complejas, solo recopilamos lo que ya está público
        en cada sitio, adaptado para que sea más rápido de ver.
      </p>

      <p>
        No hay un gran estudio detrás de la selección de estas páginas. Las escogí porque son las que yo,
        personalmente, uso más. Cada una tiene algo que me gusta: el diseño, la velocidad de subida,
        o simplemente que ya estaba acostumbrado a ellas. En retrospectiva, sí debí haber considerado criterios
        más técnicos al seleccionarlas, porque resultó que cada una maneja la información de forma distinta,
        y tuve que hacer lógica especial para cada una... pero no me arrepiento.
      </p>

      <p>
        Al final, esta página es una herramienta hecha con cariño, para mí y para cualquiera que quiera
        lo mismo: ver rápidamente qué anime salió nuevo, sin perder tiempo rebotando entre sitios.
      </p>

      <h2 className="text-xl font-semibold mt-8">Fuentes utilizadas</h2>
      <ul className="grid gap-4 md:grid-cols-3 list-none p-0">
        <li className="flex items-center space-x-3">
          <Image
            src={SOURCE_LOGOS.animeflv}
            alt="AnimeFLV"
            width = {LOGO_SIZE}
            height = {LOGO_SIZE}
            className="rounded-md"
          />
          <a
            href={SOURCE_LINKS.animeflv}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 hover:underline"
          >
            AnimeFLV <ExternalLink size={16} />
          </a>
        </li>
        <li className="flex items-center space-x-3">
          <Image
            src={SOURCE_LOGOS.animeav1}
            alt="AnimeAV1"
            width = {LOGO_SIZE}
            height = {LOGO_SIZE}
            className="rounded-md"
          />
          <a
            href={SOURCE_LINKS.animeav1}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 hover:underline"
          >
            AnimeAV1 <ExternalLink size={16} />
          </a>
        </li>
        <li className="flex items-center space-x-3">
          <Image
            src={SOURCE_LOGOS.otakustv}
            alt="OtakusTV"
            width = {LOGO_SIZE}
            height = {LOGO_SIZE}
            className="rounded-md"
          />
          <a
            href={SOURCE_LINKS.otakustv}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 hover:underline"
          >
            OtakusTV <ExternalLink size={16} />
          </a>
        </li>
      </ul>
    </section>
  );
}
