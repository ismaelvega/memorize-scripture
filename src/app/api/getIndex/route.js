'use server'

export async function GET(){
    const fs = require('fs')
    const path = require('path')

    const filePath = path.join('./src/dist/bible_data', '_index.json')
    const fileContent = fs.readFileSync(filePath, 'utf-8')
    const jsonData = JSON.parse(fileContent)

    return Response.json({ data: jsonData })
}