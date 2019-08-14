class SqlFilter {
    constructor(column, description, value, operator) {
        this.column = column;
        this.description = description;
        this.value = value;
        this.operator = operator;
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

            let [column, operator, type] = param.split("__");
            let value = requestQuery[param];
            let sqlFilter;

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
                    sqlFilter = new SqlFilter(column, "", value, "=");
                    break;
                case "notequals":
                    sqlFilter = new SqlFilter(column, "", value, "<>");
                    break;
                case "startswith":
                    sqlFilter = new SqlFilter(column, "", `${value}%`, "like");
                    break;
                case "endswith":
                    sqlFilter = new SqlFilter(column, "", `%${value}`, "like");
                    break;
                case "contains":
                    sqlFilter = new SqlFilter(column, "", `%${value}%`, "like");
                    break;
                case "gt":
                    sqlFilter = new SqlFilter(column, "", value, ">");
                    break;
                case "lt":
                    sqlFilter = new SqlFilter(column, "", value, "<");
                    break;
                case "gte":
                    sqlFilter = new SqlFilter(column, "", value, ">=");
                    break;
                case "lte":
                    sqlFilter = new SqlFilter(column, "", value, "<=");
                    break;
                case "in":
                    sqlFilter = new SqlFilter(column, "", value, "in");
                    break;
                case "notin":
                    sqlFilter = new SqlFilter(column, "", value, "notin");
                    break;
                default:
                    continue;
            }

            sqlFilters.push(sqlFilter);
        }

        return sqlFilters;
    }
}

module.exports = SqlFilter;
