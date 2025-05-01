import Stock from "./Stock";
import Portfolio from "./Portfolio";

export default class User {
    constructor(user = null) {
        //TODO: figure out how this works:
        this.bcrypt = require('bcrypt');

        //list of stocks populating drop-down menu, more can be added by the user
        let stocksAddedToSim = [];

        //new user, make a new account:
        if(!user) {
            //create a new portfolio for the user:
            this.portfolio = new Portfolio();

            //the drop down menu will pull from this list to determine which stocks to display:
            //give the user a list of popular stocks to initially choose from:
            stocksAddedToSim = [
                new Stock('AAPL'),
                new Stock('AMD'),
                new Stock('PFE'),
                new Stock('SMCI'),
                new Stock('NVDA'),
                new Stock('F'),
                new Stock('AMZN')
            ];
        }
        //previous user, let them login:
        else{
            this.portfolio = user.portfolio;
            this.stocksAddedToSim = user.stocksAddedToSim;
        }

        //TODO: make sure this is handled securely
        let password = "";
        let username = "";

    }

    addStockToSim(stock){
        this.stocksAddedToSim.push(stock);
    }

    //run this when a user purchases a stock:
    addStockToPortfolio(stock, quantity){
        for(let i = 0; i < quantity; i++){
            if(stock.symbol === this.stocksAddedToSim[i].symbol){
                this.portfolio.addStockToPortfolio(this.stocksAddedToSim[i], quantity);
                return;
            }
        }
    }

    //run this when a user sells a stock:
    removeStockFromPortfolio(stock, quantity){
        for(let i = 0; i < quantity; i++){
            if(stock.symbol === this.stocksAddedToSim[i].symbol){
                this.portfolio.removeStockFromPortfolio(this.stocksAddedToSim[i], quantity);
                return;
            }
        }
    }

    /*
    hashPassword(password) {
        const saltRounds = 10;
        return this.bcrypt.hashSync(password, saltRounds);
    }

    validatePassword(password) {
        return this.bcrypt.compareSync(password, this.passwordHash);
    }
    */
}