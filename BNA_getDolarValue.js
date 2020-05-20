#!/usr/bin/node


const puppeteer = require('puppeteer')
const fs = require('fs')
const retry = require('async-retry')
const dateObj = new Date()
const actualMonth = dateObj.getUTCMonth() + 1
const actualDay = dateObj.getUTCDate() 
const actualYear = dateObj.getUTCFullYear()
const actualHour = dateObj.getUTCHours()-3
const actualMinute = dateObj.getUTCMinutes()
const actualSeconds = dateObj.getUTCSeconds()
const URL_BNA = 'https://www.bna.com.ar/Personas'
const DateNow = ' Hora:'+actualHour+':'+actualMinute+':'+actualSeconds
const dia_ejecucion= actualDay+'-'+actualMonth+'-'+actualYear



const dataOutput = async () => {
    return new Promise(async function(resolve, reject) {
        try {
            const fecha = await page.$eval('#divisas > table > thead > tr > th.fechaCot', e=> e.innerText)
            let dolarVentaFromBilletes = await page.$eval('#billetes > table > tbody > tr:nth-child(1) > td:nth-child(3)', e => e.innerText)
            const moneda = ' Dolar USA'
            await page.click('#rightHome > div.col-md-3 > div > ul > li:nth-child(2) > a')
            await page.waitForSelector('#divisas > table > tbody > tr:nth-child(1)')

            let dolarCotizacionDivisas = await page.$eval('#divisas > table > tbody > tr:nth-child(1) > td:nth-child(3)', e => e.innerText)

            const JSONData = JSON.stringify({
                "Cotizacion Billetes": {"precioVenta":dolarVentaFromBilletes+moneda},
                "Cotizacion Divisas": {"precioVenta":dolarCotizacionDivisas+moneda},
                "timestamp": {"Fecha":fecha + DateNow}
            })

            fs.writeFileSync('BnaExtraccionDolarVenta'+dia_ejecucion+'.json', JSONData,'utf8')
            resolve(true)
            logSuccessAndExit()
        } catch (err) {
            console.log(err)
            reject(err)
        }
    })
}
 

const processDataRequest = async () => {
    return new Promise(async function(resolve, reject) {
           try {
                await page.waitForSelector('div.tabSmall')
                try {
                    const result = await dataOutput()
                    resolve(result)
                } catch (err) {
                    reject(err.message)
                }
            }catch(err){
            //browser.close()
                console.log("No se encontro el selector")
                console.log(err)
                logErrorAndExit(true)
                throw new Error(err)
                
            }

                    
    })
}

const preparePage = async () => {
    browser = await puppeteer.launch({
         headless: true,
        //headless: true,
        args: [
            '--no-sandbox',
            '--disable-features=site-per-process',
            '--disable-gpu',
            '--window-size=1920x1080',
        ]
    })
    viewPort = {
        width: 1300,
        height: 900
    }


    page = await browser.newPage()
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/72.0.3626.109 Safari/537.36');
    await page.setViewport(viewPort)
    await page.setDefaultNavigationTimeout(20000)
    await page.setDefaultTimeout(20000)

    await page.goto(URL_BNA, {
        waitUntil: 'networkidle0'
    })

}

const run = async () => {
    // preparo el navegador e ingreso al sistema
    await retry(async bail => {
        // if anything throws, we retry
        await preparePage()
    }, {
        retries: 5,
        onRetry: async err => {
            console.log(err)
            console.log('Retrying...')
            await page.close()
            await browser.close()
        }
    })

    try {
        console.log('primer try...')
        const processResult = await processDataRequest()
        logSuccessAndExit(processResult)
    } catch (err) {
        console.log(err)
        throw new Error(err)
    }
}

const logErrorAndExit = async error => {
    //const resultChangeStatus = await updateJobResult(processParams.job_id, 'error', null, error)
    console.log(JSON.stringify({
        state: 'failure',
     /* job_id: processParams.job_id,
        job_type: processParams.job_type,
        job_status: 'error',
        job_data: null,
        job_error: error*/

    }))

    process.exit()
}

const logSuccessAndExit = async resultData => {
    //const resultChangeStatus = await updateJobResult(processParams.job_id, 'finished', resultData, null)
    console.log(JSON.stringify({
        state: 'normal',
            /*data: {
            job_id: processParams.job_id,
            job_type: processParams.job_type,
            job_status: 'finished',
            job_data: resultData,
            job_error: null
        }*/

    }))

    process.exit()
}
run().catch(logErrorAndExit)