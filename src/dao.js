const _ = require("lodash");

const db = require("./db");

class Dao {
    constructor() {
        this.comandosSql = [];
    }

    adicionar(comandoSql) {        
        if (_.isArray(comandoSql)) {
            for (let comando of comandoSql) {
                this.comandosSql.push(comando);
            }
        } else if (_.isObject(comandoSql)) {
            this.comandosSql.push(comandoSql);
        }
    }

    executar() {
        return db.execute(this);
    }
}

module.exports = Dao;