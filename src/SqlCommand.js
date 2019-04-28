const _ = require("lodash");
const moment = require("moment");
const db = require("./db");
const dbEngine = process.env.DB_ENGINE;

class SqlCommand {
    constructor(query, parameters) {
        this.query = query || "";
        this.parameters = parameters || [];
    }

    createQuery(query, sqlFilters) {        
        let clauses = "";
        let count = 0;

        for (let sqlFilter of sqlFilters) {
            if (count == 0) {
                clauses += " where ";
            } else {
                clauses += " and ";
            }

            clauses += `${sqlFilter.column} ${sqlFilter.operator} ? `;
            count++;

            this.adicionarParametro(filtro.valor);
        }         

        this.query = query.replace("$clauses", clauses);
    }

    addParameter(parameter) {
        if (_.isDate(parameter)) {
            throw new Error("Favor utilizar as funções específicas de data para parametros do tipo data");
        }

        this.parameters.push(parameter);
    }
    
    _addParameterDateByFormat(parameter, format) {
        if (parameter === null) {
            return this.parameters.push(parameter);
        } 
                
        if (!_.isDate(parameter)) {
            throw new Error(`O parametro ${parameter} não é uma data válida`);
        } 

        let dateTimeFormated = moment(parameter).format(format);
        switch (dbEngine) {
            case "pg":
                if (format === "HH:mm:ss") {
                    return this.parameters.push(dateTimeFormated);
                } else {
                    return this.parameters.push(parameter);
                }                
            
            case "ado":                                
                return this.parameters.push(`#${dateTimeFormated}#`);
        }
    }    

    addParameterData(parameter) {        
        this._addParameterDateByFormat(parameter, "YYYY-MM-DD");
    }

    addParameterTime(parameter) {
        this._addParameterDateByFormat(parameter, "HH:mm:ss");
    }

    addParameterDateTime(parameter) {
        this._addParameterDateByFormat(parameter, "YYYY-MM-DD HH:mm:ss");
    }    

    handlePgParameters() {
        let count = 0;

        this.query = this.query.replace(/\?/g, () => {
            count++;
            return `$${count}`;
        });
    }
    
    handleAdoParameters() {
        for (let parameter of this.parameters) {
            if (_.isString(parameter)) {
                if (parameter.startsWith("#")) {
                    this.query = this.query.replace("?", parameter);
                } else {
                    this.query = this.query.replace("?", `'${parameter}'`);
                }
            } else if (_.isNumber(parameter)) {
                this.query = this.query.replace("?", parameter);
            } else if (_.isNull(parameter)) {
                this.query = this.query.replace("?", "null");
            }
        }        
    }

    executeQuery() {
        return db.query(this);
    }            

    async findOne() {
        const results = await this.executeQuery();
        return results[0];
    };
}

module.exports = SqlCommand;