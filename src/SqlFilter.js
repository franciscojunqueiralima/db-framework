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
                case "equals":
                    sqlFilter = new SqlFilter(column, "", value, "=");
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
                default:
                    continue;
            }

            sqlFilters.push(sqlFilter);
        }

        return sqlFilters;
    }
}

module.exports = SqlFilter;

/*
- String Operators
    equals
    startswith
    endswith
    contains
- Number operators
    equals
    notequals
    gt
    lt
    gte
    lte
- Boolean operator
    equals
- Time, Date, and Time Stamp operators
    after
    before
    between
- Additional Date and Time Stamp operators
    year
    month
    day
- Stage ID operators
    equals
    notequals
*/
