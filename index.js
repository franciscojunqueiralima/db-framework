const comandoSql = require("./src/comando-sql");
const dao = require("./src/dao");
const db = require("./src/db");
const filtro = require("./src/filtro");

module.exports = { 
    ...comandoSql, 
    ...dao,
    ...db,
    ...filtro
}; 