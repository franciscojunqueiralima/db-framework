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

            // Check for converts in string value
            if (operator.includes("-")) {
                let [type, innerOperator] = operator.split("-");
                switch (type) {
                    case "str":
                        value = String(value);
                        break;
                    case "num":
                        value = Number(value);
                        break;
                    case "dat":
                        let stringDate = String(value);
                        value = new Date(
                            Number(stringDate.substring(0, 4)),
                            Number(stringDate.substring(5, 7)),
                            Number(stringDate.substring(8, 10))
                        );

                        break;
                }

                operator = innerOperator;
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
                default:
                    continue;
            }

            sqlFilters.push(sqlFilter);
        }

        return sqlFilters;
    }
}

module.exports = SqlFilter;
