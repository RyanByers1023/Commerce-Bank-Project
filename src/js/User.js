import Stock from "./Stock";
import Portfolio from "./Portfolio";

export default class User {
    constructor(user = null) {
        //holds the actual stock objects
        this.stocksAddedToSim = [];

        this.password = "";
        this.username = "";

        //new user, make a new account:
        if(!user) {
            //create a new portfolio for the user:
            this.portfolio = new Portfolio();

            //the drop down menu will pull from this list to determine which stocks to display:
            //give the user a list of popular stocks to initially choose from:

            //get a username and password from the user:
            //NOT IMPLEMENTED
            //TODO: make sure this is handled securely
        }
        //previous user, initialize their market session:
        else{
            this.portfolio = user.portfolio;
            this.stocksAddedToSim = user.stocksAddedToSim;
            this.username = user.username;
            this.password = user.password;
        }
    }

    addStockToSim(stock){
        this.stocksAddedToSim.push(stock);
    }

    //run this when a user purchases a stock:
    addStockToPortfolio(stockSymbol, quantity){
        for(let i = 0; i < quantity; i++){
            if(stockSymbol === this.stocksAddedToSim[i].symbol){ //this stock is in the sim
                this.portfolio.addStockToPortfolio(stockSymbol, quantity);
                return;
            }
        }
    }

    //run this when a user sells a stock:
    removeStockFromPortfolio(stockSymbol, quantity){
        for(let i = 0; i < quantity; i++){
            if(stockSymbol === this.stocksAddedToSim[i].symbol){ //this stock is in the sim
                this.portfolio.removeStockFromPortfolio(this.stocksAddedToSim[i], quantity);
                return;
            }
        }
    }
}