import Link from "next/link";

export const metadata = {
  title: "Términos de Servicio | Memoriza Su Palabra",
  description:
    "Términos de Servicio de Memoriza Su Palabra: condiciones de uso, responsabilidades y contacto.",
};

export default function TerminosDeServicioPage() {
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
            Términos de Servicio — Memoriza Su Palabra
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            Última actualización: 10 de febrero de 2026
          </p>
        </div>

        <section className="space-y-4 text-base text-neutral-700 dark:text-neutral-300">
          <p>
            Estos Términos de Servicio (los “Términos”) regulan el uso de{" "}
            <strong>Memoriza Su Palabra</strong> (el “Servicio”), disponible en{" "}
            <strong>memorizasupalabra.com</strong>. Al acceder o usar el Servicio,
            aceptas estos Términos. Si no estás de acuerdo, no uses el Servicio.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-50">
            1) Quién ofrece el Servicio
          </h2>
          <dl className="grid gap-2 text-base text-neutral-700 dark:text-neutral-300">
            <div>
              <dt className="font-semibold text-neutral-900 dark:text-neutral-100">Titular / Responsable</dt>
              <dd>Ismael Grimaldo</dd>
            </div>
            <div>
              <dt className="font-semibold text-neutral-900 dark:text-neutral-100">Ubicación</dt>
              <dd>Monterrey, México</dd>
            </div>
            <div>
              <dt className="font-semibold text-neutral-900 dark:text-neutral-100">Contacto</dt>
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
            2) Elegibilidad
          </h2>
          <p className="text-base text-neutral-700 dark:text-neutral-300">
            El Servicio no está dirigido a menores de <strong>13 años</strong>. Si eres menor
            de 13, no debes usar el Servicio. Si tienes entre 13 y la mayoría de edad en tu país,
            debes usar el Servicio con consentimiento de tu madre/padre/tutor, cuando aplique.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-50">
            3) Cuenta y acceso
          </h2>
          <p className="text-base text-neutral-700 dark:text-neutral-300">
            Para usar ciertas funciones necesitas crear una cuenta mediante{" "}
            <strong>correo electrónico</strong>. La autenticación se gestiona con Supabase
            (por ejemplo, enlaces o códigos enviados por correo).
          </p>
          <p className="text-base text-neutral-700 dark:text-neutral-300">
            Te comprometes a:
          </p>
          <ul className="list-disc space-y-1 pl-5 text-base text-neutral-700 dark:text-neutral-300">
            <li>Proporcionar un correo válido y mantenerlo actualizado.</li>
            <li>Mantener la confidencialidad de tu sesión/dispositivo.</li>
            <li>Notificarnos si crees que tu cuenta fue comprometida.</li>
          </ul>
          <p className="text-base text-neutral-700 dark:text-neutral-300">
            Podemos suspender temporalmente el acceso si detectamos actividad inusual, abuso o
            riesgo de seguridad.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-50">
            4) Uso permitido
          </h2>
          <p className="text-base text-neutral-700 dark:text-neutral-300">
            Puedes usar el Servicio para fines personales y legítimos, principalmente para practicar
            y registrar tu progreso.
          </p>
          <p className="text-base text-neutral-700 dark:text-neutral-300">
            No puedes:
          </p>
          <ul className="list-disc space-y-1 pl-5 text-base text-neutral-700 dark:text-neutral-300">
            <li>Usar el Servicio para actividades ilegales.</li>
            <li>Intentar acceder sin autorización a sistemas, bases de datos o cuentas ajenas.</li>
            <li>Interferir con el funcionamiento del Servicio (por ejemplo, ataques, scraping agresivo, abuso de endpoints).</li>
            <li>Subir o introducir contenido malicioso (malware) o instrucciones que dañen a terceros.</li>
            <li>Utilizar el Servicio de forma que pueda afectar la estabilidad, disponibilidad o seguridad.</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-50">
            5) Contenido del usuario y progreso
          </h2>
          <p className="text-base text-neutral-700 dark:text-neutral-300">
            El Servicio puede guardar tu <strong>progreso</strong> (por ejemplo, práctica, estadísticas,
            rachas, preferencias) en tablas alojadas en Supabase.
          </p>
          <p className="text-base text-neutral-700 dark:text-neutral-300">
            Tú conservas la titularidad del contenido que ingreses. Nos otorgas una licencia limitada
            (no exclusiva) únicamente para <strong>operar el Servicio</strong> (guardar, procesar, mostrar y
            recuperar tu progreso dentro de la app).
          </p>
          <p className="text-base text-neutral-700 dark:text-neutral-300">
            Recomendación: no ingreses información personal sensible (por ejemplo: datos médicos,
            datos bancarios, información muy privada), ya que la app está diseñada para progreso de práctica.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-50">
            6) Propiedad intelectual
          </h2>
          <p className="text-base text-neutral-700 dark:text-neutral-300">
            El nombre, marca, diseño, código, interfaz y materiales del Servicio (salvo contenido tuyo)
            pertenecen a Ismael Grimaldo o a sus licenciantes. No puedes copiar, modificar, distribuir,
            vender o explotar el Servicio sin autorización escrita.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-50">
            7) Analítica y rendimiento
          </h2>
          <p className="text-base text-neutral-700 dark:text-neutral-300">
            El Servicio utiliza Vercel Analytics para métricas de rendimiento/uso general. Para más
            información, consulta la{" "}
            <Link
              href="/politica-de-privacidad"
              className="text-neutral-900 underline underline-offset-4 hover:text-neutral-700 dark:text-neutral-100 dark:hover:text-neutral-200"
            >
              Política de Privacidad
            </Link>
            .
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-50">
            8) Disponibilidad y cambios
          </h2>
          <p className="text-base text-neutral-700 dark:text-neutral-300">
            Podemos actualizar, modificar o descontinuar partes del Servicio en cualquier momento para
            mejorar funciones o seguridad. No garantizamos que el Servicio esté disponible siempre,
            sin interrupciones o sin errores.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-50">
            9) Suspensión y terminación
          </h2>
          <p className="text-base text-neutral-700 dark:text-neutral-300">
            Podemos suspender o terminar tu acceso si:
          </p>
          <ul className="list-disc space-y-1 pl-5 text-base text-neutral-700 dark:text-neutral-300">
            <li>Violaste estos Términos</li>
            <li>Usaste el Servicio de forma abusiva o riesgosa</li>
            <li>Es necesario por motivos de seguridad o cumplimiento legal</li>
          </ul>
          <p className="text-base text-neutral-700 dark:text-neutral-300">
            También puedes dejar de usar el Servicio en cualquier momento.
          </p>
          <p className="text-base text-neutral-700 dark:text-neutral-300">
            <strong>Eliminación de cuenta y datos:</strong> si deseas eliminar tu cuenta y/o progreso,
            solicita la eliminación escribiendo a{" "}
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
            ) con el asunto <strong>“Eliminación de cuenta”</strong>.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-50">
            10) Exención de garantías
          </h2>
          <p className="text-base text-neutral-700 dark:text-neutral-300">
            El Servicio se ofrece <strong>“tal cual”</strong> y <strong>“según disponibilidad”</strong>.
            En la medida permitida por la ley, no otorgamos garantías de:
          </p>
          <ul className="list-disc space-y-1 pl-5 text-base text-neutral-700 dark:text-neutral-300">
            <li>Funcionamiento ininterrumpido</li>
            <li>Exactitud absoluta</li>
            <li>Ausencia total de errores</li>
            <li>Adecuación a un propósito particular</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-50">
            11) Limitación de responsabilidad
          </h2>
          <p className="text-base text-neutral-700 dark:text-neutral-300">
            En la medida permitida por la ley:
          </p>
          <ul className="list-disc space-y-1 pl-5 text-base text-neutral-700 dark:text-neutral-300">
            <li>No seremos responsables por daños indirectos, incidentales, especiales o consecuenciales.</li>
            <li>
              Nuestra responsabilidad total por reclamaciones relacionadas con el Servicio no excederá
              el equivalente a <strong>$0 MXN</strong> si el Servicio es gratuito (o el monto pagado en los
              últimos 12 meses si existiera un plan de pago).
            </li>
          </ul>
          <p className="text-base text-neutral-700 dark:text-neutral-300">
            Nada en estos Términos excluye responsabilidad que no pueda excluirse por ley.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-50">
            12) Indemnización
          </h2>
          <p className="text-base text-neutral-700 dark:text-neutral-300">
            Aceptas indemnizar y mantener indemne al titular del Servicio frente a reclamaciones
            derivadas de:
          </p>
          <ul className="list-disc space-y-1 pl-5 text-base text-neutral-700 dark:text-neutral-300">
            <li>Tu uso del Servicio en violación de estos Términos</li>
            <li>Tu contenido</li>
            <li>Tu incumplimiento de leyes aplicables</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-50">
            13) Ley aplicable y jurisdicción
          </h2>
          <p className="text-base text-neutral-700 dark:text-neutral-300">
            Estos Términos se rigen por las leyes de <strong>México</strong>. Cualquier disputa se
            someterá a los tribunales competentes de <strong>Monterrey, Nuevo León</strong>, salvo que
            la ley disponga otra cosa.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-50">
            14) Contacto
          </h2>
          <p className="text-base text-neutral-700 dark:text-neutral-300">
            Para dudas, soporte o cuestiones legales:
          </p>
          <p className="text-base text-neutral-700 dark:text-neutral-300">
            <a
              href="mailto:soporte@memorizasupalabra.com"
              className="text-neutral-900 underline underline-offset-4 hover:text-neutral-700 dark:text-neutral-100 dark:hover:text-neutral-200"
            >
              soporte@memorizasupalabra.com
            </a>
            {" "}o{" "}
            <a
              href="mailto:ismaelgrive@gmail.com"
              className="text-neutral-900 underline underline-offset-4 hover:text-neutral-700 dark:text-neutral-100 dark:hover:text-neutral-200"
            >
              ismaelgrive@gmail.com
            </a>
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-50">
            15) Cambios a estos Términos
          </h2>
          <p className="text-base text-neutral-700 dark:text-neutral-300">
            Podemos actualizar estos Términos ocasionalmente. Publicaremos la versión vigente en esta
            página y actualizaremos la fecha de “Última actualización”. El uso continuado del Servicio
            implica aceptación de los cambios.
          </p>
        </section>
      </div>
    </main>
  );
}
