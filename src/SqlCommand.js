const _ = require("lodash");
const moment = require("moment");

const db = require("./db");
const SqlFilter = require("./SqlFilter.js");

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
                } else {
                    this.addParameter(sqlFilter.value);
                }
            }
        }

        this.query = query.replace("$clauses", clauses);
    }

    createPatchQuery(table, data, where) {
        // Handle table
        this.query = `update ${table} set `;

        // Handle data
        let first = true;
        Object.keys(data).forEach((key) => {
            if (first) {
                first = false;
            } else {
                this.query += ", ";
            }

            let [column, type] = key.split("__");

            this.query += `${column} = ?`;
            this.addParameterWithType(data[key], type);
        });

        // Handle where
        first = true;
        Object.keys(where).forEach((key) => {
            if (first) {
                first = false;
                this.query += " where ";
            } else {
                this.query += " and ";
            }

            let [column, type] = key.split("__");

            this.query += `${column} = ?`;
            this.addParameterWithType(where[key], type);
        });
    }

    createQueryByRequestQuery(
        requestQuery,
        defaultFields,
        defaultSqlFrom,
        defaultSqlFilters,
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

            //Handle sql from
            if (requestQuery["sqlFrom"]) {
                defaultSqlFrom = requestQuery["sqlFrom"];
            }

            // Handle filters
            const sqlFilters = SqlFilter.getSqlFiltersByRequestQuery(
                requestQuery
            );

            if (sqlFilters.length > 0) {
                if (_.isArray(defaultSqlFilters)) {
                    for (let sqlFilter of sqlFilters) {
                        defaultSqlFilters.push(sqlFilter);
                    }
                } else {
                    defaultSqlFilters = sqlFilters;
                }
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
        query += ` ${defaultFields} from ${defaultSqlFrom} $clauses`;

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

        this.createQuery(query, defaultSqlFilters);
    }

    addParameter(parameter) {
        if (_.isDate(parameter)) {
            throw new Error(
                "Favor utilizar as funções específicas de data para parametros do tipo data"
            );
        }

        this.parameters.push(parameter);
    }

    addParameterWithType(parameter, type) {
        switch (type) {
            case "date":
            case "datetime":
            case "time":
                let date = new Date(parameter);
                if (parameter === null) {
                    date = null;
                }

                if (type === "date") {
                    this.addParameterDate(date);
                } else if (type === "datetime") {
                    this.addParameterDateTime(date);
                } else if (type === "time") {
                    this.addParameterTime(date);
                }
                break;
            default:
                this.addParameter(parameter);
                break;
        }
    }

    _addParameterDateByFormat(parameter, format) {
        if (parameter === null) {
            return this.parameters.push(parameter);
        }

        if (!_.isDate(parameter)) {
            throw new Error(`O parametro ${parameter} não é uma data válida`);
        }

        let dateTimeFormated = moment(parameter).format(format);
        switch (process.env.DB_ENGINE) {
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
