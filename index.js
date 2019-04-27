const ComandoSql = require("./src/ComandoSql.js");
const Filtro = require("./src/Filtro.js");
const Dao = require("./src/Dao.js");
const db = require("./src/db.js");

module.exports = { 
    ComandoSql, 
    Filtro,
    Dao,
    ...db,
};