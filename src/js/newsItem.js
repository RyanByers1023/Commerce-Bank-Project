class NewsItem {
    constructor(newsTemplate, newsType) {
        this.newsType = newsType;

        //float in range (0.1 - 0.9).
        this.impact = newsTemplate.impact;
        this.timestamp = new Date();

        //if there is a target (not market wide, but rather a company or a sector),
        //generateNewsTarget() will construct the target. if it can't (e.g. newsTarget == NULL),
        //target is not needed, and is set to NULL
        this.target = this.generateNewsTarget();
        
        this.headline = newsTemplate.text.replace(
            '{company}',
            this.type === 'marketWide' || !this.target ? 'Unknown Company' : this.target.name
        );
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
