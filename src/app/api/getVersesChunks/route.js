import MistralClient from "@mistralai/mistralai";

export async function GET(req, res) {
    const book = req.nextUrl.searchParams.get('book')
    const chapter = req.nextUrl.searchParams.get('chapter')
    const verse = req.nextUrl.searchParams.get('verse')
    const verseContent = req.nextUrl.searchParams.get('verseContent')
    const verseContentDefault = 'Porque de tal manera amó Dios al mundo, que ha dado a su Hijo unigénito, para que todo aquel que en él cree, no se pierda, mas tenga vida eterna.'
    const apiKey = process.env.MISTRAL_API_KEY;

    const cliente = new MistralClient(apiKey);

    const chatResponse = await cliente.chat({
        model: 'mistral-small-latest',
        response_format: {'type': 'json_object'},
        messages: [{
            role: 'user',
            content: `Eres un experto en dividir los versículos de la Biblia en pequeños fragmentos para memorizar el versículo de una manera más sencilla.
            Basado en el versículo proporcionado:
            ${book} ${chapter}:${verse}
            ${verseContent || verseContentDefault}
            Considera lo siguiente:
            - El propósito de dividir el versículo es memorizarlo de manera más sencilla.
            - Importante: a pesar de que buscamos facilitar el memorizar el versículo, el contenido del mismo no va a cambiar.
            - No es estrictamente necesario dividir el versículo en partes iguales. Dividelo de manera que tenga sentido.
            - Hay versículos cortos, sencillos de memorizar. Considera si es necesario dividirlos.
            - Habrá oraciones más complejas que otras. Considera dividirlas en partes más pequeñas.
            Devuelve solo y solo los fragmentos de este versículo, cada uno en un elemento tipo array. Esto debe estar en formato JSON: Ejemplo:
            {
                "passage": "{book} {chapter}:{verse}",
                "versesChunks": [
                    "Porque de tal manera amó Dios al mundo",
                    "que ha dado a su Hijo unigénito",
                    "para que todo aquel que en él cree",
                    "no se pierda, mas tenga vida eterna."
                ]
            }`
        }]
    })

    console.log('Chat: ', chatResponse.choices[0].message.content, )

    return Response.json({ data: JSON.parse(chatResponse.choices[0].message.content)})
}

