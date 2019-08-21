const _ = require("lodash");

class SqlFilter {
    constructor(column, description, value, operator, orOperator) {
        this.column = column;
        this.description = description;
        this.value = value;
        this.operator = operator;
        this.orOperator = orOperator ? true : false;
    }

    getOperator() {
        if (this.operator === "notin") {
            return "not in";
        }

        return this.operator;
    }
    
    static getSqlFiltersByRequestQuery(requestQuery) {
        const sqlFilters = [];

        for (let param in requestQuery) {
            if (!param.includes("__")) {
                continue;
            }

            let sqlFilter;
            let [column, operator, type, orOperator] = param.split("__");
            let values = [];

            if (_.isArray(requestQuery[param])) {
                values = requestQuery[param];
            } else {
                values.push(requestQuery[param]);
            }            

            for (let value of values) {
                // Check for type convertion
                if (type) {
                    switch (type) {
                        case "number":
                            value = Number(value);
                            break;
                        case "date":
                            let stringDate = String(value);
                            value = new Date(
                                Number(stringDate.substring(0, 4)),
                                Number(stringDate.substring(5, 7)),
                                Number(stringDate.substring(8, 10))
                            );

                            break;
                    }
                }

                switch (operator) {
                    case "equals":
                        sqlFilter = new SqlFilter(column, "", value, "=", orOperator);
                        break;
                    case "notequals":
                        sqlFilter = new SqlFilter(column, "", value, "<>", orOperator);
                        break;
                    case "startswith":
                        sqlFilter = new SqlFilter(column, "", `${value}%`, "like", orOperator);
                        break;
                    case "endswith":
                        sqlFilter = new SqlFilter(column, "", `%${value}`, "like", orOperator);
                        break;
                    case "contains":
                        sqlFilter = new SqlFilter(column, "", `%${value}%`, "like", orOperator);
                        break;
                    case "gt":
                        sqlFilter = new SqlFilter(column, "", value, ">", orOperator);
                        break;
                    case "lt":
                        sqlFilter = new SqlFilter(column, "", value, "<", orOperator);
                        break;
                    case "gte":
                        sqlFilter = new SqlFilter(column, "", value, ">=", orOperator);
                        break;
                    case "lte":
                        sqlFilter = new SqlFilter(column, "", value, "<=", orOperator);
                        break;
                    case "in":
                        sqlFilter = new SqlFilter(column, "", value, "in", orOperator);
                        break;
                    case "notin":
                        sqlFilter = new SqlFilter(column, "", value, "notin", orOperator);
                        break;
                    default:
                        continue;
                }

                sqlFilters.push(sqlFilter);
            }
        }

        return sqlFilters;
    }
}

module.exports = SqlFilter;
