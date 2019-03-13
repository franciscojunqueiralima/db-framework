const _ = require("lodash");
const db = require("./db");

class ComandoSql {
    constructor() {
        this.query = "";
        this.parametros = [];
    }

    montarQuery(query, filtros) {        
        var clausulas = "";
        var count = 0;

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

    adicionarParametro(parametro) {
        this.parametros.push(parametro);
    }

    adicionarFiltros(filtros) {
        if (_.isArray(filtros))
        filtros.forEach((filtro) => {
            this.adicionarParametro(filtro.valor);
        });
    }    

    executar() {
        return db.executarComandoSql(this);
    }
}

module.exports = {
    ComandoSql    
}