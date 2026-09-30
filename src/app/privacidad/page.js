import Navbar from "@/components/layout/Navbar";

export const metadata = {
  title: "Privacidad y cookies",
  description: "Qué datos trata streaming-Sntx, para qué, con quién se comparten y cómo ejercer tus derechos.",
};

const REPO_URL = "https://github.com/santyxswc/streaming-Sntx";
const CONTACT = process.env.NEXT_PUBLIC_PRIVACY_CONTACT;
const UPDATED = "30 de septiembre de 2026";

function Section({ title, children }) {
  return (
    <section className="mt-10">
      <h2 className="text-xl font-bold text-white mb-3">{title}</h2>
      <div className="space-y-3 text-gray-300 leading-relaxed">{children}</div>
    </section>
  );
}

const DATA = [
  ["Cuenta", "Correo electrónico, nombre y un identificador de usuario. La contraseña la gestiona Firebase Authentication (Google): nosotros nunca la vemos.", "Crear tu cuenta e iniciar sesión", "Firebase Auth (Google)"],
  ["Mi lista", "Los títulos que guardas como favoritos, asociados a tu identificador.", "Mostrarte tu lista en cualquier dispositivo", "Firestore (Google)"],
  ["Chat", "Los mensajes que escribes en el chat de un título, el nombre que se muestra en el chat, tu identificador y la fecha del mensaje. Son visibles para otras personas.", "Ofrecer el chat", "Neon (PostgreSQL)"],
  ["Seguridad", "Tu dirección IP, durante unos minutos, para limitar intentos abusivos.", "Proteger el servicio de abusos", "Upstash (Redis)"],
  ["Analítica (opcional)", "Páginas vistas y un identificador persistente (cookies `_ga`). Solo si la aceptas.", "Saber qué partes se usan", "Firebase Analytics (Google)"],
  ["Rendimiento", "Tiempos de carga y visitas agregadas, sin cookies ni identificadores personales.", "Mejorar la velocidad", "Vercel Analytics y Speed Insights"],
];

export default function PrivacyPage() {
  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 md:px-6 pt-28 pb-16">
        <h1 className="text-4xl font-display font-bold text-white">Privacidad y cookies</h1>
        <p className="mt-2 text-sm text-gray-500">Última actualización: {UPDATED}</p>

        <Section title="Quién trata tus datos">
          <p>
            streaming-Sntx es un proyecto personal, sin ánimo de lucro, mantenido por su autor (
            <a className="underline hover:text-white" href={REPO_URL}>
              santyxswc en GitHub
            </a>
            ). No mostramos publicidad ni vendemos datos.
          </p>
          <p>
            Para cualquier consulta sobre tus datos:{" "}
            {CONTACT ? (
              <a className="underline hover:text-white" href={`mailto:${CONTACT}`}>
                {CONTACT}
              </a>
            ) : (
              <>
                abre una incidencia en{" "}
                <a className="underline hover:text-white" href={`${REPO_URL}/issues`}>
                  el repositorio
                </a>{" "}
                (es público: no incluyas datos personales; te diremos cómo continuar en privado)
              </>
            )}
            .
          </p>
        </Section>

        <Section title="Qué datos tratamos">
          <p>Solo los necesarios para cada función. Puedes usar el catálogo y ver tráilers sin crear cuenta.</p>
          <div className="overflow-x-auto rounded-lg border border-white/10">
            <table className="w-full text-sm">
              <thead className="bg-white/5 text-left text-gray-400">
                <tr>
                  <th className="p-3">Qué</th>
                  <th className="p-3">Datos</th>
                  <th className="p-3">Para qué</th>
                  <th className="p-3">Dónde</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {DATA.map(([what, data, why, where]) => (
                  <tr key={what} className="align-top">
                    <td className="p-3 font-semibold text-white">{what}</td>
                    <td className="p-3">{data}</td>
                    <td className="p-3">{why}</td>
                    <td className="p-3">{where}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        <Section title="Base legal">
          <p>
            Cuenta, lista y chat: ejecución del servicio que pides. Seguridad: interés legítimo en proteger el servicio. Analítica de
            Google: <strong className="text-white">tu consentimiento</strong>, que puedes cambiar en cualquier momento desde «Preferencias
            de cookies», en el pie de página.
          </p>
        </Section>

        <Section title="Terceros con los que se conecta tu navegador">
          <ul className="list-disc pl-6 space-y-1">
            <li>
              <strong className="text-white">TMDB</strong> (carátulas e imágenes): al cargarlas, TMDB recibe tu dirección IP.
            </li>
            <li>
              <strong className="text-white">YouTube</strong> (tráileres, en modo <code>youtube-nocookie.com</code>): al reproducir un
              tráiler, Google recibe tu dirección IP.
            </li>
            <li>
              <strong className="text-white">Google</strong> (Firebase): inicio de sesión, lista y, si lo aceptas, analítica.
            </li>
          </ul>
          <p>Las tipografías están alojadas en este mismo sitio: no se descargan de terceros.</p>
        </Section>

        <Section title="Qué guardamos en tu dispositivo">
          <p>
            Tu sesión (la gestiona Firebase), tu lista de favoritos como copia local y tu decisión sobre las cookies. Las cookies de
            analítica (<code>_ga</code>) solo aparecen si aceptas la analítica.
          </p>
        </Section>

        <Section title="Cuánto tiempo">
          <ul className="list-disc pl-6 space-y-1">
            <li>Cuenta, lista y mensajes del chat: hasta que borres tu cuenta o nos pidas el borrado. Los mensajes no caducan solos.</li>
            <li>Dirección IP para limitar abusos: unos minutos.</li>
            <li>Registros técnicos del servidor: alrededor de una hora.</li>
            <li>Analítica de Google: según la retención configurada en el proyecto de Google Analytics.</li>
          </ul>
        </Section>

        <Section title="Tus derechos">
          <p>
            Puedes pedir acceso, rectificación, supresión, oposición, limitación y portabilidad de tus datos, y retirar el consentimiento
            cuando quieras. Si pides el borrado, eliminamos tu cuenta, tu lista y tus mensajes del chat. Si consideras que no tratamos tus
            datos correctamente, puedes reclamar ante la autoridad de protección de datos de tu país.
          </p>
        </Section>

        <Section title="Menores y otras plataformas">
          <p>
            El servicio no está dirigido a menores de edad sin autorización de quien los represente. La aplicación de escritorio usa el mismo
            inicio de sesión y la misma lista, y no incluye analítica.
          </p>
        </Section>

        <Section title="Cambios">
          <p>
            Si cambia algo relevante, actualizaremos esta página y su fecha. El historial está en{" "}
            <a className="underline hover:text-white" href={`${REPO_URL}/commits/main/src/app/privacidad/page.js`}>
              el repositorio
            </a>
            .
          </p>
        </Section>
      </main>
    </div>
  );
}
