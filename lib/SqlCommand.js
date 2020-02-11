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
            for (let i = 0; i < sqlFilters.length; i++) {
                const sqlFilter = sqlFilters[i];
            
                // Condition for or operator
                let previousSqlFilterWasOrOperator = false;
                if (sqlFilter.orOperator) {
                    let previousIndex = i - 1;       

                    if (previousIndex < 0) {
                        previousSqlFilterWasOrOperator = false;
                    } else {
                        previousSqlFilterWasOrOperator = sqlFilters[previousIndex].orOperator;                        
                    }                    
                }

                if (!previousSqlFilterWasOrOperator) {
                    if (count === 0) {
                        clauses += " where ";
                    } else {
                        clauses += " and ";
                    }

                    if (sqlFilter.orOperator && !previousSqlFilterWasOrOperator) {
                        clauses += "(";
                    }
                }                

                // Add sql
                clauses += `${sqlFilter.column} ${sqlFilter.getOperator()} `;
                
                // Condition for in operator
                if (this.isOperatorIn(sqlFilter.operator)) {
                    clauses += "(";
                    for (let i = 0; i < sqlFilter.value.split(',').length; i++) {
                        if (i !== 0) {
                            clauses += ",";
                        }
                        clauses += "?";
                    }
                    clauses += ")";
                } else {
                    clauses += " ?";
                }
                
                // Condition for or operator
                if (sqlFilter.orOperator) {
                    let nextIndex = i + 1;
                    let nextSqlFilterIsOrOperator;

                    if (nextIndex >= sqlFilters.length) {
                        nextSqlFilterIsOrOperator = false;
                    } else {
                        nextSqlFilterIsOrOperator = sqlFilters[nextIndex].orOperator;                        
                    }

                    if (nextSqlFilterIsOrOperator) {
                        clauses += " or ";
                    } else {
                        clauses += ")";
                    }
                }

                // Add parameter
                if (_.isDate(sqlFilter.value)) {
                    if (sqlFilter.value.getHours() === 0 &&
                        sqlFilter.value.getMinutes() === 0 &&
                        sqlFilter.value.getSeconds() === 0) {
                        this.addParameterDate(sqlFilter.value);
                    } else {
                        this.addParameterDateTime(sqlFilter.value);
                    }
                } else {
                    this.addParameter(sqlFilter.value, sqlFilter.operator);
                }

                count++;
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
        if (where) {
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
    }

    createQueryByRequestQuery(requestQuery, fields, sqlFrom, sqlFilters, sort, limit, offset) {
        // Handle request query object
        if (requestQuery) {
            // Handle fields
            if (requestQuery["fields"]) {
                fields = requestQuery["fields"];
            }

            //Handle sql from
            if (requestQuery["sqlFrom"]) {
                sqlFrom = requestQuery["sqlFrom"];
            }

            // Handle filters
            const handledSqlFilters = SqlFilter.getSqlFiltersByRequestQuery(requestQuery);
            if (handledSqlFilters.length > 0) {
                sqlFilters = handledSqlFilters;
            }

            // Handle sort
            if (requestQuery["sort"]) {
                sort = "";
                for (let sortParam of requestQuery["sort"].split(",")) {
                    sortParam = sortParam.trim();

                    if (sort !== "") {
                        sort += ", ";
                    }

                    if (sortParam.startsWith("-")) {
                        sortParam = `${sortParam.replace("-", "")} desc`;
                    }

                    sort += sortParam;
                }
            }

            // Handle limit
            if (requestQuery["limit"]) {
                limit = requestQuery["limit"];
            }

            // Handle offset
            if (requestQuery["offset"]) {
                offset = requestQuery["offset"];
            }
        }

        // Query creation
        let query = "select";

        // Ado top
        if (limit && process.env.DB_ENGINE === "ado") {
            query += ` top ${limit}`;
        }

        // Query from
        query += ` ${fields} from ${sqlFrom} $clauses`;

        // Query order by
        if (sort) {
            query += ` order by ${sort}`;
        }

        // Pg limit
        if (limit && process.env.DB_ENGINE === "pg") {
            query += ` limit ${limit}`;
        }

        // Pg offset
        if (offset && process.env.DB_ENGINE === "pg") {
            query += ` offset ${offset}`;
        }

        this.createQuery(query, sqlFilters);
    }

    addParameter(parameter, operator) {
        if (_.isDate(parameter)) {
            throw new Error("Favor utilizar as funções específicas de data para parametros do tipo data");
        }

        if (this.isOperatorIn(operator)) {
            let parameterList = parameter.split(',');
            for (let i = 0; i < parameterList.length; i++) {
                this.parameters.push(parameterList[i].trim());
            }
        } else {
            this.parameters.push(parameter);   
        }        
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

    handleAutoAliasFields() {
        let matches = this.query.match(/select (.*?) from/gi);
        if (!matches) {
            return;
        }

        for (let match of matches) {
            let columns = match
                .replace(/select/gi, "")
                .replace(/from/gi, "")
                .trim();

            let newQuery = "";
            let distinct = false;
            for (let column of columns.split(",")) {
                column = column.trim();

                if (column.endsWith("*")) {
                    newQuery += column;
                } else if (column === "distinct") {
                    distinct = true;
                } else {
                    if (newQuery !== "") {
                        newQuery += ", ";
                    }

                    if (column.toLowerCase().includes(" as ")) {
                        let lastChar = column[column.length - 1];
                        if (lastChar === '"') {
                            newQuery += column;
                        } else {
                            column = `${column.replace(" as ", ' as "')}"`;
                            newQuery += column;
                        }
                    } else {
                        newQuery += `${column} as "${column}"`;
                    }
                }
            }

            if (distinct) {
                newQuery = `distinct ${newQuery}`;
            }
            
            newQuery = `select ${newQuery} from`;
            this.query = this.query.replace(match, newQuery);
        }
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

    isOperatorIn(operator) {
        return ["in", "notin"].includes(operator);
    }
}

module.exports = SqlCommand;
