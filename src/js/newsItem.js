class NewsItem {
    constructor(newsType, newsTemplate, newsTarget = null) {
        this.type = newsType;
        this.impact = newsTemplate.impact;
        this.timestamp = new Date();

        //if there is a target (a company or a sector)
        //this method will construct the target, if it can't (newsTarget == NULL)
        //otherwise, target is not needed, and is set to NULL
        this.target = this.generateNewsTarget(newsTarget);
        
        this.headline = newsTemplate.text.replace('{company}', this.target?.name || 'Unknown Company');
    }

    generateNewsTarget(newsTarget){
        if(newsTarget){
            return {
                type: 'company',
                symbol: newsTarget.symbol,
                name: newsTarget.name
            };
        }else {
            return null;
        }
    }
}
