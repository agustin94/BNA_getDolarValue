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
const URL_BYMA_ACCIONES = 'https://www.byma.com.ar/acciones/panel/lideres'
const DateNow = actualDay+'-'+actualMonth+'-'+actualYear+' Hour:'+actualHour+':'+actualMinute+':'+actualSeconds



const dataOutput = async () => {
    return new Promise(async function(resolve, reject) {
        try {
            await page.waitForSelector('#dataStocks > tbody > tr')
            let columnListado = await page.$$('#dataStocks > tbody > tr')
            let dataListado = await page.evaluate(columnListado => columnListado.innerText, columnListado[0])
            const convertStringify = JSON.stringify(dataListado)

            console.log(convertStringify)


            let positionInColumns
            let lenghtColumnsInTable = (await page.$$('#dataStocks > tbody > tr')).length
            console.log(lenghtColumnsInTable)

            for(positionInColumns = 0; positionInColumns < lenghtColumnsInTable; positionInColumns++) {
                dataListado = await page.evaluate(columnListado => columnListado.innerText, columnListado[positionInColumns])
                let separatedataListado  = dataListado.split('\t')
                let resultInTable = {  
                     especie: separatedataListado[0],
                     cierre_listado : separatedataListado[1],
                     precio_apertura : separatedataListado[2],
                     precio_maximo : separatedataListado[3],
                     precio_minimo : separatedataListado[4], 
                     ultimo_precio : separatedataListado[5],
                     variacion_diaria : separatedataListado[6],
                     volumen_efectivo$ : separatedataListado[7],
                     volumen_minimal : separatedataListado[8],
                     precio_pom_pond : separatedataListado[9]
                }
                console.log(resultInTable.especie+' '+resultInTable.cierre_listado)
                const putJSONData = JSON.stringify({
                
                "Info": {

                    "Date": DateNow,
                    "Especie": resultInTable.especie,
                    "Cierre Listado": resultInTable.cierre_listado,
                    "Precio Apertura": resultInTable.precio_apertura,
                    "Precio Maximo": resultInTable.precio_maximo,
                    "Precio Minimo": resultInTable.precio_minimo,
                    "Ultimo Precio": resultInTable.ultimo_precio,
                    "Variacion Diaria": resultInTable.variacion_diaria,
                    "Volumen Efectivo $": resultInTable.volumen_efectivo$,
                    "Volumen Minimal": resultInTable.volumen_minimal,
                    "Precio Pom Pond": resultInTable.precio_pom_pond
                  },
                },)
                fs.appendFileSync('byma_Valores'+actualDay+actualMonth+actualYear+'.json',putJSONData)
     
                console.log(putJSONData)
            }

        browser.close()
        process.exit()
        } catch (err) {
            console.log(err)
            reject(err)
        }
    })
}
 

const processDataRequest = async () => {
    return new Promise(async function(resolve, reject) {
           try {
                await page.waitFor(5000)
                if(await page.$('body > main > div.wrapper.data-section > h1') === null){
                    console.log('Sitio no disponible') 
                    logErrorAndExit(true)                  
                }

            try {
                const result = await dataOutput()
                resolve(result)
            } catch (err) {
                reject(err.message)
            }
            
            }catch(err){
            //browser.close()
                console.log("Fallo")
                console.log(err)
                logErrorAndExit(true)
                throw new Error(err)
                
            }

                    
    })
}

const preparePage = async () => {
    browser = await puppeteer.launch({
         headless: false,
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

    await page.goto(URL_BYMA_ACCIONES, {
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