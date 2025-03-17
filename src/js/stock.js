class Stock {
    constructor(symbol, name, price, volume) {
        this.symbol = symbol; //AAPL, META, etc.
        this.name = name; //Apple Corporation, Meta Corportation, etc.
        this.price = price; //price of the underlying stock
        this.volume = volume; //how much of the stock is currently being traded in the market (for the day)

        //below are some attributes I think would be useful, but have no implementation yet:
        this.openPrice = 0.0; //price of stock at market open time

        this.highestPrice = 0.0; //greatest price stock achieved (over the course of the day, resets at market open)
        this.lowestPrice = 0.0;

        this.previousClosePrice = 0.0; //the last price of the stock at previous market close
        this.priceHistory = 0.0; //an array that tracks the price of the stock over time     
    }

    //assign the price of the stock to newPrice
    updatePrice(newPrice){
        this.price = newPrice;
    }

    //returns a string representing current stock attrbutes, can be used for debugging if needed
    toString() {
        return `Stock Name: ${this.name} | Stock Symbol: (${this.symbol}) | Stock Price: $${this.price} | Volume: ${this.volume}`;
    }
}