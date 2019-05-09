class SqlFilter {
    constructor(column, description, value, operator) {
        this.column = column;
        this.description = description;
        this.value = value;
        this.operator = operator;
    }

    static getSqlFiltersByRequestQuery(requestQuery) {
        const sqlFilters = [];

        for (let param in requestQuery) {
            let [column, operator] = param.split("__");
            let value = requestQuery[param];
            let sqlFilter;

            switch (operator) {
                // Generic operators
                case "equals":
                    sqlFilter = new SqlFilter(column, "", value, "=");
                    break;
                case "notequals":
                    sqlFilter = new SqlFilter(column, "", value, "<>");
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
                // Operators for strings
                case "startswith":
                    sqlFilter = new SqlFilter(column, "", `${value}%`, "like");
                    break;
                case "endswith":
                    sqlFilter = new SqlFilter(column, "", `%${value}`, "like");
                    break;
                case "contains":
                    sqlFilter = new SqlFilter(column, "", `%${value}%`, "like");
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
