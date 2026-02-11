import Link from "next/link";

export const metadata = {
  title: "Política de Privacidad | Memoriza Su Palabra",
  description:
    "Política de Privacidad de Memoriza Su Palabra: cómo recopilamos, usamos y protegemos tu información.",
};

export default function PoliticaDePrivacidadPage() {
  return (
    <main className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-6 py-12">
        <div className="flex flex-col gap-2">
          <Link
            href="/"
            className="text-sm font-medium text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
          >
            Volver al inicio
          </Link>
          <h1 className="text-3xl font-semibold text-neutral-900 dark:text-neutral-50">
            Política de Privacidad — Memoriza Su Palabra
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            Última actualización: 10 de febrero de 2026
          </p>
        </div>

        <section className="space-y-4 text-base text-neutral-700 dark:text-neutral-300">
          <p>
            Esta Política de Privacidad explica cómo se recopila, usa y protege tu
            información cuando utilizas <strong>Memoriza Su Palabra</strong> (el
            “Servicio”), disponible en <strong>memorizasupalabra.com</strong>.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-50">
            1) Responsable del tratamiento
          </h2>
          <dl className="grid gap-2 text-base text-neutral-700 dark:text-neutral-300">
            <div>
              <dt className="font-semibold text-neutral-900 dark:text-neutral-100">Responsable</dt>
              <dd>Ismael Grimaldo</dd>
            </div>
            <div>
              <dt className="font-semibold text-neutral-900 dark:text-neutral-100">Ubicación</dt>
              <dd>Monterrey, México</dd>
            </div>
            <div>
              <dt className="font-semibold text-neutral-900 dark:text-neutral-100">Contacto de privacidad</dt>
              <dd>
                <a
                  href="mailto:ismaelgrive@gmail.com"
                  className="text-neutral-900 underline underline-offset-4 hover:text-neutral-700 dark:text-neutral-100 dark:hover:text-neutral-200"
                >
                  ismaelgrive@gmail.com
                </a>
              </dd>
            </div>
            <div>
              <dt className="font-semibold text-neutral-900 dark:text-neutral-100">Correo de soporte</dt>
              <dd>
                <a
                  href="mailto:soporte@memorizasupalabra.com"
                  className="text-neutral-900 underline underline-offset-4 hover:text-neutral-700 dark:text-neutral-100 dark:hover:text-neutral-200"
                >
                  soporte@memorizasupalabra.com
                </a>
              </dd>
            </div>
          </dl>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-50">
            2) Qué información recopilamos
          </h2>

          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-50">
              2.1 Información de cuenta (inicio de sesión)
            </h3>
            <p className="text-base text-neutral-700 dark:text-neutral-300">
              El Servicio permite iniciar sesión mediante <strong>correo electrónico</strong>,
              usando autenticación gestionada por Supabase (por ejemplo, envío de correo de
              confirmación/enlace o código). En este proceso se tratan típicamente:
            </p>
            <ul className="list-disc space-y-1 pl-5 text-base text-neutral-700 dark:text-neutral-300">
              <li>Correo electrónico</li>
              <li>Identificadores técnicos de autenticación (por ejemplo, IDs internos, tokens de sesión)</li>
              <li>Fechas/horas de acceso y eventos de seguridad relacionados con el inicio de sesión</li>
            </ul>
          </div>

          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-50">
              2.2 Información de uso y progreso
            </h3>
            <p className="text-base text-neutral-700 dark:text-neutral-300">
              Guardamos tu <strong>progreso</strong> de memorización y práctica en tablas dentro de
              Supabase. Esto puede incluir, según la funcionalidad:
            </p>
            <ul className="list-disc space-y-1 pl-5 text-base text-neutral-700 dark:text-neutral-300">
              <li>Versículos o referencias que eliges practicar</li>
              <li>Resultados/estado de progreso (por ejemplo, aciertos/errores, rachas, nivel, fechas de práctica)</li>
              <li>Preferencias básicas dentro de la app</li>
            </ul>
            <blockquote className="rounded-lg border border-neutral-200 bg-white p-4 text-sm text-neutral-600 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300">
              Nota: No necesitas proporcionar datos “sensibles” para usar la app. Evita escribir
              información personal sensible en campos de texto libre (si existieran), porque el
              Servicio está pensado para progreso de práctica.
            </blockquote>
          </div>

          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-50">
              2.3 Analítica y datos técnicos
            </h3>
            <p className="text-base text-neutral-700 dark:text-neutral-300">
              Usamos Vercel Analytics para entender el rendimiento y uso general del sitio (por
              ejemplo: páginas vistas, rendimiento, eventos agregados). También podemos procesar
              datos técnicos mínimos necesarios para operar el Servicio, como:
            </p>
            <ul className="list-disc space-y-1 pl-5 text-base text-neutral-700 dark:text-neutral-300">
              <li>Tipo de navegador/dispositivo (de forma general)</li>
              <li>Datos de rendimiento y errores (crashes, fallos de carga)</li>
              <li>Registros técnicos para seguridad y prevención de abuso</li>
            </ul>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-50">
            3) Para qué usamos tu información
          </h2>
          <p className="text-base text-neutral-700 dark:text-neutral-300">
            Usamos tu información para:
          </p>
          <ul className="list-disc space-y-1 pl-5 text-base text-neutral-700 dark:text-neutral-300">
            <li>Proveer autenticación y acceso a tu cuenta (login por correo)</li>
            <li>Guardar y mostrar tu progreso de memorización y práctica</li>
            <li>Operar, mantener y mejorar el Servicio (rendimiento, estabilidad, corrección de errores)</li>
            <li>Proteger el Servicio (seguridad, detección de abuso, integridad de sesiones)</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-50">
            4) Base legal (según aplique)
          </h2>
          <p className="text-base text-neutral-700 dark:text-neutral-300">
            Dependiendo de tu jurisdicción, tratamos datos con base en:
          </p>
          <ul className="list-disc space-y-1 pl-5 text-base text-neutral-700 dark:text-neutral-300">
            <li><strong>Prestación del servicio / relación contractual</strong>: para operar la cuenta y guardar el progreso.</li>
            <li><strong>Interés legítimo</strong>: para seguridad, prevención de fraude/abuso y mejora técnica.</li>
            <li><strong>Consentimiento</strong> (si aplica): para analítica o funcionalidades opcionales que requieran permiso según normativa local.</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-50">
            5) Con quién compartimos tu información
          </h2>
          <p className="text-base text-neutral-700 dark:text-neutral-300">
            No vendemos tu información.
          </p>
          <p className="text-base text-neutral-700 dark:text-neutral-300">
            Podemos compartir información <strong>solo</strong> con proveedores que nos ayudan a
            operar el Servicio, por ejemplo:
          </p>
          <ul className="list-disc space-y-1 pl-5 text-base text-neutral-700 dark:text-neutral-300">
            <li>Supabase: autenticación y base de datos para almacenar el progreso.</li>
            <li>Vercel: hosting del sitio y analítica (Vercel Analytics).</li>
          </ul>
          <p className="text-base text-neutral-700 dark:text-neutral-300">
            Estos proveedores procesan datos únicamente para prestar el servicio correspondiente y
            bajo condiciones de seguridad razonables.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-50">
            6) Transferencias internacionales
          </h2>
          <p className="text-base text-neutral-700 dark:text-neutral-300">
            Al usar proveedores de infraestructura, es posible que algunos datos se procesen en
            servidores fuera de México, dependiendo de la región configurada por el proveedor.
            Tomamos medidas razonables para que el tratamiento sea consistente con esta Política.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-50">
            7) Retención de datos
          </h2>
          <ul className="list-disc space-y-1 pl-5 text-base text-neutral-700 dark:text-neutral-300">
            <li><strong>Progreso y cuenta</strong>: se conserva mientras mantengas tu cuenta activa o hasta que solicites la eliminación.</li>
            <li><strong>Registros técnicos y seguridad</strong>: pueden conservarse por un periodo limitado (por ejemplo, hasta 90 días) para diagnóstico, seguridad y prevención de abuso, y luego se eliminan o anonimiza(n) cuando sea posible.</li>
            <li><strong>Analítica</strong>: se conserva según la configuración y políticas del proveedor de analítica y/o en forma agregada.</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-50">
            8) Tus derechos (México — ARCO) y cómo ejercerlos
          </h2>
          <p className="text-base text-neutral-700 dark:text-neutral-300">
            Si te encuentras en México, puedes ejercer tus derechos <strong>ARCO</strong>:
            Acceso, Rectificación, Cancelación y Oposición.
          </p>
          <p className="text-base text-neutral-700 dark:text-neutral-300">
            Para ejercerlos, envía un correo a{" "}
            <a
              href="mailto:soporte@memorizasupalabra.com"
              className="text-neutral-900 underline underline-offset-4 hover:text-neutral-700 dark:text-neutral-100 dark:hover:text-neutral-200"
            >
              soporte@memorizasupalabra.com
            </a>{" "}
            (o{" "}
            <a
              href="mailto:ismaelgrive@gmail.com"
              className="text-neutral-900 underline underline-offset-4 hover:text-neutral-700 dark:text-neutral-100 dark:hover:text-neutral-200"
            >
              ismaelgrive@gmail.com
            </a>
            ) con el asunto: <strong>“Privacidad — Derechos ARCO”</strong> e incluye:
          </p>
          <ul className="list-disc space-y-1 pl-5 text-base text-neutral-700 dark:text-neutral-300">
            <li>Tu correo de cuenta</li>
            <li>Tu solicitud concreta (qué derecho deseas ejercer)</li>
            <li>Información mínima para verificar que eres el titular (por seguridad)</li>
          </ul>
          <p className="text-base text-neutral-700 dark:text-neutral-300">
            Responderemos en plazos razonables conforme a la normativa aplicable.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-50">
            9) Cookies y tecnologías similares
          </h2>
          <p className="text-base text-neutral-700 dark:text-neutral-300">
            El sitio puede utilizar tecnologías necesarias para que funcione correctamente (por
            ejemplo, sesiones o almacenamiento local del navegador). Además, Vercel Analytics puede
            recopilar métricas de uso y rendimiento. Según la configuración, esto puede funcionar
            sin cookies o con identificadores limitados. Si en el futuro añadimos cookies no
            esenciales, publicaremos un aviso y, cuando aplique, opciones de consentimiento.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-50">
            10) Seguridad
          </h2>
          <p className="text-base text-neutral-700 dark:text-neutral-300">
            Aplicamos medidas razonables para proteger tu información (por ejemplo, cifrado en
            tránsito HTTPS, controles de acceso, prácticas de seguridad de proveedores). Aun así,
            ningún sistema es completamente infalible.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-50">
            11) Menores de edad
          </h2>
          <p className="text-base text-neutral-700 dark:text-neutral-300">
            El Servicio no está dirigido a menores de <strong>13 años</strong>. Si crees que un
            menor nos proporcionó información personal, contáctanos para revisarlo y, en su caso,
            eliminarla.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-50">
            12) Cambios a esta Política
          </h2>
          <p className="text-base text-neutral-700 dark:text-neutral-300">
            Podemos actualizar esta Política ocasionalmente. Publicaremos la versión vigente en
            esta página y actualizaremos la fecha de “Última actualización”.
          </p>
        </section>
      </div>
    </main>
  );
}
