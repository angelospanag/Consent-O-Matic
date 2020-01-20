class DomParser {
    static async parseCmpDom(dom) {
        dom = cQuery(dom);

        let result = {
            detectors: [],
            methods: []
        };

        for(let detectorDom of dom.find("[data-type='detector']")) {
            let detectorJson = await DomParser.parseDetectorDom(detectorDom);
            result.detectors.push(detectorJson);
        }

        for(let methodDom of dom.find("[data-type='method']")) {
            let methodJson = await DomParser.parseMethodDom(methodDom);
            result.methods.push(methodJson);
        }

        return result;
    }

    static async parseDetectorDom(dom) {
        dom = cQuery(dom);

        let result = {
            presentMatcher: null,
            showingMatcher: null
        };

        let presentMatcherDom = dom.find("[data-bind='presentMatcher'] [data-type='matcher']");
        if(presentMatcherDom.length > 0) {
            let matcherJson = await DomParser.parseMatcherDom(presentMatcherDom);
            result.presentMatcher = matcherJson;
        }

        let showingMatcherDom = dom.find("[data-bind='showingMatcher'] [data-type='matcher']");
        if(showingMatcherDom.length > 0) {
            let matcherJson = await DomParser.parseMatcherDom(showingMatcherDom);
            result.showingMatcher = matcherJson;
        }

        return result;
    }

    static async parseMatcherDom(dom) {
        dom = cQuery(dom);

        let result = {
            type: dom[0].getAttribute("data-variant")
        };

        let domSelectorDom = dom.find("[data-plug='domSelector'] [data-type='domSelector']");
        if(domSelectorDom.length > 0) {
            let domSelectorJson = await DomParser.parseDomSelectorDom(domSelectorDom);
            Object.assign(result, domSelectorJson);
        }

        return result;
    }

    static async parseDomSelectorDom(dom) {
        dom = cQuery(dom);

        let result = {};

        async function parseDomSelector(dom) {
            dom = cQuery(dom);
            let result = {};

            let selectorInput = dom.find("[data-bind='selector'] input")[0];
            let textFilterInput = dom.find("[data-bind='textFilter'] input")[0];
            let iframeFilterInput = dom.find("[data-bind='iframeFilter'] input")[0];
            let displayFilterInput = dom.find("[data-bind='displayFilter'] input")[0];
            let childFilter = cQuery(dom.find("[data-bind='childFilter']")[0]);

            if(selectorInput.value.trim().length > 0) {
                result.selector = selectorInput.value.trim();
            }
            if(textFilterInput.value.trim().length > 0) {
                result.textFilter = textFilterInput.value.split("|").map(s => s.trim()).filter(s => s.length > 0);
            }
            if(iframeFilterInput.checked) {
                result.iframeFilter = iframeFilterInput.checked;
            }
            if(displayFilterInput.checked) {
                result.displayFilter = displayFilterInput.checked;
            }
            if(childFilter.find(".target, .parent").length > 0) {
                result.childFilter = await DomParser.parseDomSelectorDom(childFilter);
            }

            if(Object.keys(result).length === 0) {
                return null;
            }

            return result;
        }

        let parent = await parseDomSelector(dom.find(".parent")[0]);
        let target = await parseDomSelector(dom.find(".target")[0]);

        if(parent != null) {
            result.parent = parent;
        }
        if(target != null) {
            result.target = target;
        }

        return result;
    }

    static async parseMethodDom(dom) {
        dom = cQuery(dom);

        let result = {};

        result.name = dom.find("[data-bind='name']")[0].textContent;

        let actionDom = dom.find("[data-bind='action'] [data-type='action']");
        if(actionDom.length > 0) {
            result.action = await DomParser.parseActionDom(actionDom[0]);
        } else {
            result.action = null;
        }

        return result;
    }

    static async parseActionDom(dom) {
        dom = cQuery(dom);

        let result = {};

        if(dom[0].hasAttribute("data-variant")) {
            result.type = dom[0].getAttribute("data-variant");
        } else {
            result.type = dom.find("[data-variant]")[0].getAttribute("data-variant");
        }

        switch(result.type) {
            case "list":
                await DomParser.parseListActionDom(dom, result);
                break; 
            case "click":
                await DomParser.parseClickActionDom(dom, result);
                break; 
            case "foreach":
                await DomParser.parseForEachActionDom(dom, result);
                break; 
            case "consent":
                await DomParser.parseConsentActionDom(dom, result);
                break; 
            case "waitcss":
                await DomParser.parseWaitCssActionDom(dom, result);
                break; 
            case "ifcss":
                await DomParser.parseIfCssActionDom(dom, result);
                break; 
            case "slide":
                await DomParser.parseSlideActionDom(dom, result);
                break; 
            case "close":
                //No extra parameters
                break; 
            default:
                console.log("Unknown action type: ", result.type);
                break;
        }

        return result;
    }

    static async parseListActionDom(dom, result) {
        result.actions = [];
        //Find first level of actions (Might be list action somewhere furhter down)
        for(let actionDom of cQuery(dom.find("[data-bind='actions']")[0]).children("[data-type='action']")) {
            result.actions.push(await DomParser.parseActionDom(actionDom));
        }
    }

    static async parseClickActionDom(dom, result) {
        Object.assign(result, await DomParser.parseDomSelectorDom(dom.find("[data-plug='domSelector'] [data-type='domSelector']")[0]));
        let ctrlKeyInput = dom.find("[data-bind='ctrlKey'] input")[0];
        if(ctrlKeyInput.checked) {
            result.ctrlKey = true;
        }
    }

    static async parseSlideActionDom(dom, result) {
        Object.assign(result, await DomParser.parseDomSelectorDom(dom.find("[data-bind='target'] [data-type='domSelector']")[0]));
        result.dragTarget = await DomParser.parseDomSelectorDom(dom.find("[data-bind='dragTarget'] [data-type='domSelector']")[0]);
        let axis = dom.find("[data-bind='axis']")[0];
        result.axis = axis.value;
    }

    static async parseForEachActionDom(dom, result) {
        Object.assign(result, await DomParser.parseDomSelectorDom(dom.find("[data-plug='domSelector'] [data-type='domSelector']")[0]));
        result.action = await DomParser.parseActionDom(dom.find("[data-bind='action'] [data-type='action']")[0]);
    }

    static async parseIfCssActionDom(dom, result) {
        Object.assign(result, await DomParser.parseDomSelectorDom(dom.find("[data-plug='domSelector'] [data-type='domSelector']")[0]));
        let trueActionDom = dom.children("[data-bind='trueAction']").children("[data-type='action']");
        if(trueActionDom.length > 0) {
            result.trueAction = await DomParser.parseActionDom(trueActionDom);
        }

        let falseActionDom = dom.children("[data-bind='falseAction']").children("[data-type='action']");
        if(falseActionDom.length > 0) {
            result.falseAction = await DomParser.parseActionDom(falseActionDom);
        }
    }

    static async parseWaitCssActionDom(dom, result) {
        Object.assign(result, await DomParser.parseDomSelectorDom(dom.find("[data-plug='domSelector'] [data-type='domSelector']")[0]));
        let retriesInput = dom.find("[data-bind='retries'] input")[0];
        let waitTimeInput = dom.find("[data-bind='waitTime'] input")[0];
        let negatedInput = dom.find("[data-bind='negated'] input")[0];

        result.retries = parseInt(retriesInput.value);
        result.waitTime = parseInt(waitTimeInput.value);
        result.negated = negatedInput.checked;
    }

    static async parseConsentActionDom(dom, result) {
        result.consents = [];
        //Find first level of consents
        for(let consentDom of cQuery(dom.find("[data-bind='consents']")[0]).children("[data-type='consent']")) {
            result.consents.push(await DomParser.parseConsentDom(consentDom));
        }
    }

    static async parseConsentDom(dom) {
        dom = cQuery(dom);

        let result = {};

        result.type = dom.find("[data-bind='type']")[0].value;

        let matcherDom = dom.find("[data-bind='matcher'] [data-type='matcher']");
        if(matcherDom.length > 0) {
            result.matcher = await DomParser.parseMatcherDom(matcherDom);
        }

        let toggleActionDom = dom.find("[data-bind='toggleAction'] [data-type='action']");
        if(toggleActionDom.length > 0) {
            result.toggleAction = await DomParser.parseActionDom(toggleActionDom);
        }

        let trueActionDom = dom.find("[data-bind='trueAction'] [data-type='action']");
        if(trueActionDom.length > 0) {
            result.trueAction = await DomParser.parseActionDom(trueActionDom);
        }

        let falseActionDom = dom.find("[data-bind='falseAction'] [data-type='action']");
        if(falseActionDom.length > 0) {
            result.falseAction = await DomParser.parseActionDom(falseActionDom);
        }

        return result;
    }
}