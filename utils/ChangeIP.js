const { rejects } = require('assert')
const fs = require('fs')
const { resolve } = require('path')
const path = require('path')

const scriptPath1 = path.join(__dirname, '../', 'public', 'javascripts', 'home-client.js')
const scriptPath2 = path.join(__dirname, '../', 'views', 'devices', 'cardGarden.ejs')
const regexIP = /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/

const ip_addr = process.argv[2]
const checkInput = (ip, rg) => {
    return new Promise((resolve, rejects) => {
        if (ip.match(rg)) resolve(true)
        else rejects(`IP ${ip_addr} is invalid`)
    })
}
async function main() {
    try {
        await checkInput(ip_addr, regexIP)
        fs.readFile(scriptPath1, (err, buf) => {
            if (err) throw err
            const result = buf.toString().replace(regexIP, ip_addr)
            fs.writeFile(scriptPath1, result, (err) => {
                if (err) throw err
                console.log(`[INFO] Successfully changed IP domain in ${scriptPath1}`)
            })
        })

        fs.readFile(scriptPath2, (err, buf) => {
            if (err) throw err
            const result = buf.toString().replace(regexIP, ip_addr)
            fs.writeFile(scriptPath2, result, (err) => {
                if (err) throw err
                console.log(`[INFO] Successfully changed IP domain in ${scriptPath2}`)
            })
        })
    } catch (err) {
        console.error('[ERROR]', err)
    }
}

main()
