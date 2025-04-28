const bcrypt = require('bcrypt');

class User {
    constructor(username, password, portfolio) {
        this.username = username;
        this.passwordHash = this.hashPassword(password);
        this.portfolio = portfolio; // Instance of Portfolio
    }

    hashPassword(password) {
        const saltRounds = 10;
        return bcrypt.hashSync(password, saltRounds);
    }

    validatePassword(password) {
        return bcrypt.compareSync(password, this.passwordHash);
    }
}