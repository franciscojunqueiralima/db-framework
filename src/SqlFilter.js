class SqlFilter {
    constructor(column, description, value, operator) {
        this.column = column;
        this.description = description;
        this.value = value;
        this.operator = operator;
    }    
}

module.exports = SqlFilter;