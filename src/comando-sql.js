const _ = require("lodash");
const db = require("./db");



class ComandoSql {
    constructor() {
        this.query = "";
        this.parametros = [];
    }

    adicionarFiltros(filtros) {
        if (_.isArray(filtros)) {
            filtros.forEach((filtro) => {
                this.adicionarParametro(filtro.valor);
            });
        };  
    }

    adicionarParametro(parametro) {
        this.parametros.push(parametro);
    }

    async encontrarUm() {
        const results = await this.executar();
        return results[0];
    };    

    executar() {
        return db.executarComandoSql(this);
    }    

    montarQuery(query, filtros) {        
        let clausulas = "";
        let count = 0;

        if (_.isArray(filtros)) {
            filtros.forEach((filtro) => {
                if (count == 0) {
                    clausulas += " where ";
                } else {
                    clausulas += " and ";
                }
    
                clausulas += `${filtro.coluna} ${filtro.operador} ? `;
                count++;
            });
        }        

        this.query = query.replace("$filtros", clausulas);
    }
    
    tratarParametrosPg() {
        let count = 0;

        this.query = this.query.replace(/\?/g, () => {
            count++;
            return `$${count}`;
        });

        return;
    }
}

module.exports = {
    ComandoSql    
}