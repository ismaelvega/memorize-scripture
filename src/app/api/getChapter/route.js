export async function GET(req, res){
    const book = req.nextUrl.searchParams.get('book')
    const chapter = req.nextUrl.searchParams.get('chapter')

    const fs = require('fs')
    const path = require('path')

    const filePath = path.join('./bible_data', `${book}.json`)
    const fileContent = fs.readFileSync(filePath, 'utf-8')
    const jsonData = JSON.parse(fileContent)

    const chapterObj = jsonData[chapter - 1]

    return Response.json({ data: chapterObj })
}