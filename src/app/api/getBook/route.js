export async function GET(req, res){
    console.log('req', req.nextUrl.searchParams.get('book'))
    const book = req.nextUrl.searchParams.get('book')

    const fs = require('fs')
    const path = require('path')

    const filePath = path.join('./bible_data', `${book}.json`)
    const fileContent = fs.readFileSync(filePath, 'utf-8')
    const jsonData = JSON.parse(fileContent)

    return Response.json({ data: jsonData })
}