const _ = require("lodash");
const moment = require("moment");

const db = require("./db");

const dbEngine = process.env.DB_ENGINE;

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
        if (_.isDate(parametro)) {
            throw new Error("Favor utilizar as funções específicas de data para parametros do tipo data");
        }

        this.parametros.push(parametro);
    }
    
    adicionarParametroDataPorFormato(parametro, formato) {
        if (parametro === null) {
            return this.parametros.push(parametro);
        } 
                
        if (!_.isDate(parametro)) {
            throw new Error(`O parametro ${parametro} não é uma data válida`);
        } 

        let dataHoraFormatada = moment(parametro).format(formato);
        switch (dbEngine) {
            case "pg":
                if (formato === "HH:mm:ss") {
                    return this.parametros.push(dataHoraFormatada);
                } else {
                    return this.parametros.push(parametro);
                }                
            
            case "ado":                                
                return this.parametros.push(`#${dataHoraFormatada}#`);
        }
    }

    adicionarParametroData(parametro) {        
        this.adicionarParametroDataPorFormato(parametro, "YYYY-MM-DD");
    }

    adicionarParametroHorario(parametro) {
        this.adicionarParametroDataPorFormato(parametro, "HH:mm:ss");
    }

    adicionarParametroDataHora(parametro) {
        this.adicionarParametroDataPorFormato(parametro, "YYYY-MM-DD HH:mm:ss");
    }

    adicionarFiltros(filtros) {
        if (_.isArray(filtros)) {
            for (let filtro of filtros) {
                this.adicionarParametro(filtro.valor);
            };
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
                if (parametro.startsWith("#")) {
                    this.query = this.query.replace("?", parametro);
                } else {
                    this.query = this.query.replace("?", `'${parametro}'`);
                }
            } else if (_.isNumber(parametro)) {
                this.query = this.query.replace("?", parametro);
            } else if (_.isNull(parametro)) {
                this.query = this.query.replace("?", "null");
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