const _ = require("lodash");
const db = require("./db");

class ComandoSql {
    constructor() {
        this.query = "";
        this.parametros = [];
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

    adicionarParametro(parametro) {
        this.parametros.push(parametro);
    }

    adicionarFiltros(filtros) {
        if (_.isArray(filtros)) {
            filtros.forEach((filtro) => {
                this.adicionarParametro(filtro.valor);
            });
        };  
    }    

    tratarParametrosPg() {
        let count = 0;

        this.query = this.query.replace(/\?/g, () => {
            count++;
            return `$${count}`;
        });
    }
    
    tratarParametrosAdo() {
        for (let parametro of this.parametros) {
            if (_.isString(parametro)) {
                this.query = this.query.replace("?", `'${parametro}'`);
                console.log(this.query);
            }
        }
    }

    executarQuery() {
        return db.query(this);
    }            

    async encontrarUm() {
        const results = await this.executarQuery();
        return results[0];
    };
}

module.exports = ComandoSql;