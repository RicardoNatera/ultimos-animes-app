import { ExternalLink } from "lucide-react";
import { SOURCE_LINKS, SOURCE_LOGOS } from "@/types/sourceVars";
import Image from "next/image";

export default function creditsPage() {
    const LOGO_SIZE = 64
  return (
    <section className="mx-auto max-w-3xl px-4 py-12 text-[var(--foreground)] space-y-6">
      <h1 className="text-3xl font-bold">Agradecimientos</h1>

      <p>
        Este proyecto no existiría sin el trabajo diario y constante de páginas como{" "}
        <strong>AnimeFLV</strong>, <strong>AnimeAV1</strong> y <strong>OtakusTV</strong>, que se esfuerzan
        por subir todos los capítulos posibles de los animes que siguen saliendo. Gracias por mantener vivas
        estas comunidades y por compartir su contenido con tanta dedicación. 🙌
      </p>

      <p>
        Si estás disfrutando esta página, te invito a visitar sus sitios directamente y brindarles el apoyo
        que se merecen. Aquí puedes ir a cada una:
      </p>

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

      <div className="flex items-center space-x-4">
        <img
          src="https://img.itch.zone/aW1nLzE3NzkzNDA2LnBuZw==/80x80%23/QLQjLp.png"
          alt="ToffeeCraft avatar"
          width={LOGO_SIZE}
          height={LOGO_SIZE}
          className="rounded-full border"
        />
        <div>
          <p>
            También quiero agradecer especialmente al artista{" "}
            <a
              href="https://toffeecraft.itch.io/"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold hover:underline"
            >
              ToffeeCraft
            </a>{" "}
            por la hermosa animación de los gatitos que aparece mientras se cargan los animes.
          </p>
          <p>
            Puedes ver más de sus trabajos en{" "}
            <a
              href="https://toffeecraft.itch.io/"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:underline"
            >
              toffeecraft.itch.io <ExternalLink size={14} />
            </a>{" "}
            y apoyarlo si así lo deseas en{" "}
            <a
              href="https://ko-fi.com/toffeebunny"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:underline"
            >
              ko-fi.com/toffeebunny <ExternalLink size={14} />
            </a>
          </p>
        </div>
      </div>
    </section>
  );
}
