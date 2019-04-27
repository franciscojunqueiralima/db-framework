class Filtro {
    constructor(coluna, descricao, valor, operador) {
        this.coluna = coluna;
        this.descricao = descricao;
        this.valor = valor;
        this.operador = operador;
    }    
}

module.exports = Filtro;