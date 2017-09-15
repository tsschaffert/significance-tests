import * as fs from 'fs';
const commandLineArgs = require('command-line-args');

const optionDefinitions = [
    { name: 'input', type: String, multiple: true, defaultOption: true },
    { name: 'cross-validation', type: Number, multiple: false },
    { name: 'method', type: String, multiple: false },
];

function main(options) {
    if (options.input === undefined || options.input.length !== 2) {
        console.error("Two input folders or datasets to compare are required.");
        process.exit(1);
        return;
    }

    let dataset1;
    let dataset2;

    try {
        try {
            dataset1 = JSON.parse(options.input[0]);
            dataset2 = JSON.parse(options.input[1]);
        } catch(e) {
            
        }

        if (options["cross-validation"] !== undefined) {
            dataset1 = adjustForCrossvalidation(dataset1, options["cross-validation"]);
            dataset2 = adjustForCrossvalidation(dataset2, options["cross-validation"]);
        }

        // Perform Wilcoxon test if selected, or as default if not enough instances for Welch and paired results
        if (options.method === "Wilcoxon" || (options.method === undefined && dataset1.length < 30 && dataset1.length === dataset2.length)) {
            console.log("Performing Wilcoxon signed-rank test...");
            
            wilcoxonSignedRankTest(dataset1, dataset2);
        } else {
            console.log("Performing Welch test...");        
            
            welchTest(dataset1, dataset2);
        }   
    } catch(e) {
        console.log(e);
        process.exit(1);
        return;
    }
}

function welchTest(dataset1: number[], dataset2: number[]) {
    let lengthX = dataset1.length;
    let lengthY = dataset2.length;

    let meanX = dataset1.reduce((previousValue, currentValue) => previousValue + currentValue, 0) / lengthX;
    let meanY = dataset2.reduce((previousValue, currentValue) => previousValue + currentValue, 0) / lengthY;

    let varianceX = dataset1.reduce((previousValue, currentValue) => (previousValue + Math.pow(currentValue - meanX, 2)), 0) / (lengthX - 1);
    let varianceY = dataset2.reduce((previousValue, currentValue) => (previousValue + Math.pow(currentValue - meanY, 2)), 0) / (lengthY - 1);

    let s = Math.sqrt(varianceX / lengthX + varianceY / lengthY);
    let t = (meanX - meanY) / s;

    let v = Math.pow(varianceX / lengthX + varianceY / lengthY, 2) / (Math.pow(varianceX / lengthX, 2) / (lengthX - 1) + Math.pow(varianceY / lengthY, 2) / (lengthY - 1));

    console.log("Check Student's t-distribution table for");
    console.log(`t = ${t}`);
    console.log(`v = ${v}`);
}

function wilcoxonSignedRankTest(dataset1: number[], dataset2: number[]) {
    if (dataset1.length != dataset2.length) {
        throw "Equal dataset length required.";
    }

    let differences = dataset1.map((value, index) => {
        return value - dataset2[index];
    });

    differences = differences.filter((value) => value !== 0);

    differences.sort((a, b) => Math.abs(a) - Math.abs(b));
    //console.log(differences);

    let ranks = [];

    for (let i = 0; i < differences.length; i++) {
        let currentRank = i + 1;
        let currentIndex = i;
        while (i + 1 < differences.length && Math.abs(differences[i + 1]) === Math.abs(differences[i])) {
            i++;
            currentRank += i + 1;
        }

        currentRank /= (i - currentIndex + 1);

        for (let j = 0; j < i - currentIndex + 1; j++) {
            ranks.push({
                difference: differences[currentIndex + j],
                rank: currentRank
            });
        }

    }

    //console.log(ranks);

    let positiveRanks = ranks.filter((value) => value.difference > 0).map((value) => value.rank).reduce((previousValue, currentValue) => previousValue + currentValue, 0);
    let negativeRanks = ranks.filter((value) => value.difference < 0).map((value) => value.rank).reduce((previousValue, currentValue) => previousValue + currentValue, 0);
    let W = Math.min(positiveRanks, negativeRanks);
    let N = differences.length;

    if (N < 10) {
        // Table lookup required
        console.log("Lookup ciritcal values for Wilcoxon signed-rank test with")
        console.log(`n = ${N}`);
        console.log(`W = ${W}`);
    } else {
        let z = (positiveRanks - negativeRanks) / Math.sqrt(N * (N + 1) * (2*N + 1) / 6);

        console.log("Check normal distribution table for")
        console.log(`z = ${z}`);
    }
}

function adjustForCrossvalidation(dataset, n) {
    if (dataset.length % n !== 0) {
        throw "Dataset length has to be a multiple of cross-validation n.";
    }

    let result = [];

    for (let i = 0; i < dataset.length; i++) {
        if (i % n === 0) {
            result[Math.floor(i / n)] = 0;
        } 
            
        result[Math.floor(i / n)] += dataset[i];
    }

    return result.map((value) => value / n);
}


main(commandLineArgs(optionDefinitions))