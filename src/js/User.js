import Stock from "./Stock";
import Portfolio from "./Portfolio";

class User {
    constructor(user = null) {
        //TODO: figure out how this works:
        this.bcrypt = require('bcrypt');

        //new user, make a new account:
        if(!user) {
            //create a new portfolio for the user:
            this.portfolio = new Portfolio();

            //the drop down menu will pull from this list to determine which stocks to display:
            //give the user a list of popular stocks to initially choose from:
            let stocksAddedToSim = [
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

    //TODO: rework these functions:
    hashPassword(password) {
        const saltRounds = 10;
        return this.bcrypt.hashSync(password, saltRounds);
    }

    validatePassword(password) {
        return this.bcrypt.compareSync(password, this.passwordHash);
    }
}

export default User;