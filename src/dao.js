const _ = require("lodash");
const db = require("./db");

class Dao {
    constructor() {
        this.comandosSql = [];
    }

    adicionar(comandoSql) {        
        if (_.isArray(comandoSql)) {
            comandoSql.forEach((comando) => {
                this.comandosSql.push(comando);
            });
        } else if (_.isObject(comandoSql)) {
            this.comandosSql.push(comandoSql);
        }
    }

    executar() {
        return db.executarComandosSql(this);
    }
}

module.exports = {
    Dao
}