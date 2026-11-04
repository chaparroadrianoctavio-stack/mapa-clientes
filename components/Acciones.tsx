import type { Cliente } from "@/lib/tipos";
import { urlComoLlegar, urlLlamar, urlWhatsapp } from "@/lib/utils";

const base =
  "flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs font-semibold transition active:scale-95";

export default function Acciones({ cliente }: { cliente: Cliente }) {
  const llegar = urlComoLlegar(cliente);
  return (
    <div className="flex gap-2">
      <a
        href={urlWhatsapp(cliente)}
        target="_blank"
        rel="noopener noreferrer"
        className={`${base} bg-green-600 !text-white hover:bg-green-700`}
        onClick={(e) => e.stopPropagation()}
      >
        <IconoWhatsapp /> WhatsApp
      </a>
      <a
        href={urlLlamar(cliente)}
        className={`${base} bg-sky-600 !text-white hover:bg-sky-700`}
        onClick={(e) => e.stopPropagation()}
      >
        <IconoTel /> Llamar
      </a>
      {llegar ? (
        <a
          href={llegar}
          target="_blank"
          rel="noopener noreferrer"
          className={`${base} bg-slate-700 !text-white hover:bg-slate-800 dark:bg-slate-600 dark:hover:bg-slate-500`}
          onClick={(e) => e.stopPropagation()}
        >
          <IconoRuta /> Cómo llegar
        </a>
      ) : (
        <span
          className={`${base} cursor-not-allowed bg-slate-200 text-slate-400 dark:bg-slate-800 dark:text-slate-500`}
          title="Este cliente no tiene ubicación"
        >
          <IconoRuta /> Cómo llegar
        </span>
      )}
    </div>
  );
}

function IconoWhatsapp() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
      <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.3-.4.7-1.4.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.1 5.1 0 0 0 1.1 2.7 11.7 11.7 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.1-1.2l-.5-.3Z" />
    </svg>
  );
}

function IconoTel() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2" />
    </svg>
  );
}

function IconoRuta() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="m3 11 18-8-8 18-2-8-8-2Z" />
    </svg>
  );
}
