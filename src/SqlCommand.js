const _ = require("lodash");
const moment = require("moment");

const db = require("./db");
const SqlFilter = require("./SqlFilter.js");

const dbEngine = process.env.DB_ENGINE;

class SqlCommand {
    constructor(query, parameters) {
        this.query = query || "";
        this.parameters = parameters || [];
    }

    createQuery(query, sqlFilters) {
        let clauses = "";
        let count = 0;

        if (_.isArray(sqlFilters)) {
            for (let sqlFilter of sqlFilters) {
                if (count === 0) {
                    clauses += " where ";
                } else {
                    clauses += " and ";
                }

                clauses += `${sqlFilter.column} ${sqlFilter.operator} ? `;
                count++;

                if (_.isDate(sqlFilter.value)) {
                    if (
                        sqlFilter.value.getHours() === 0 &&
                        sqlFilter.value.getMinutes() === 0 &&
                        sqlFilter.value.getSeconds() === 0
                    ) {
                        this.addParameterDate(sqlFilter.value);
                    } else {
                        this.addParameterDateTime(sqlFilter.value);
                    }
                }
            }
        }

        this.query = query.replace("$clauses", clauses);
    }

    createQueryByRequestQuery(
        requestQuery,
        defaultFields,
        sqlFrom,
        defautSqlFilters,
        defaultSort,
        defaultLimit,
        defaultOffset
    ) {
        // Handle request query object
        if (requestQuery) {
            // Handle fields
            if (requestQuery["fields"]) {
                defaultFields = requestQuery["fields"];
            }

            // Handle filters
            const sqlFilters = SqlFilter.getSqlFiltersByRequestQuery(
                requestQuery
            );

            if (sqlFilters.length > 0) {
                defautSqlFilters = sqlFilters;
            }

            // Handle sort
            if (requestQuery["sort"]) {
                defaultSort = "";
                for (let sortParam of requestQuery["sort"].split(",")) {
                    sortParam = sortParam.trim();

                    if (defaultSort !== "") {
                        defaultSort += ", ";
                    }

                    if (sortParam.startsWith("-")) {
                        sortParam = `${sortParam.replace("-", "")} desc`;
                    }

                    defaultSort += sortParam;
                }
            }

            // Handle limit
            if (requestQuery["limit"]) {
                defaultLimit = requestQuery["limit"];
            }

            // Handle offset
            if (requestQuery["offset"]) {
                defaultOffset = requestQuery["offset"];
            }
        }

        // Query creation
        let query = "select";

        // Ado top
        if (defaultLimit && process.env.DB_ENGINE === "ado") {
            query += ` top ${defaultLimit}`;
        }

        // Query from
        query += ` ${defaultFields} from ${sqlFrom} $clauses`;

        // Query order by
        if (defaultSort) {
            query += ` order by ${defaultSort}`;
        }

        // Pg limit
        if (defaultLimit && process.env.DB_ENGINE === "pg") {
            query += ` limit ${defaultLimit}`;
        }

        // Pg offset
        if (defaultOffset && process.env.DB_ENGINE === "pg") {
            query += ` offset ${defaultOffset}`;
        }

        this.createQuery(query, defautSqlFilters);
    }

    addParameter(parameter) {
        if (_.isDate(parameter)) {
            throw new Error(
                "Favor utilizar as funções específicas de data para parametros do tipo data"
            );
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

    addParameterDate(parameter) {
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
    }
}

module.exports = SqlCommand;
