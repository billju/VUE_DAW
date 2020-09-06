export default {
    data:()=>({
        encoding: 'UTF-8', filename: 'My Project',
    }),
    methods: {
        downloadLink(href,filename){
            let a = document.createElement('a')
            a.href = href
            a.download = filename
            document.body.appendChild(a)
            a.click()
            document.body.removeChild(a)
        },
        downloadText(text,filename='downlaod.txt',textType='plain'){
            let href = `data:text/${textType};charset=${this.encoding},` + encodeURIComponent(text)
            this.downloadLink(href,filename)
        },
        exportJSON(rows){
            this.downloadText(JSON.stringify(rows),`${this.filename}.json`,'plain')
        }
    }
}