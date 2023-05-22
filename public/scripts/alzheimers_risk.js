const fs = require('fs');
const csv = require('csv-parser');
const ss = require('simple-statistics');

var results = [];

var ageSlope = 0;
var ageIntercept = 0;

var sexSlope = 0;
var sexIntercept = 0;

var eduSlope = 0;
var eduIntercept = 0;

async function runAnalysis() {
    return new Promise((resolve, reject) => {
        fs.createReadStream('public/resources/alzheimer.csv')
            .pipe(csv())
            .on('data', (data) => {
                if (data.Group !== 'Converted') {
                    const [sex1, sex2] = data['M/F'].split('/');
                    const sex = sex1.trim() || sex2.trim(); // Choose the non-empty value
                    results.push({
                        Age: Number(data.Age),
                        Group: data.Group === 'Nondemented' ? 0 : 1,
                        Sex: sex === 'F' ? 0 : 1,
                        Edu: Number(data.EDUC)
                    });
                }
            })
            .on('end', () => {
                const data = results;
                // Extract all ages
                const ages = data.map((data) => data.Age);
                // Extract all genders
                const sexes = data.map((data) => data.Sex);
                // Extract all education levels
                const edu = data.map((data) => data.Edu);
                // Extract all groups
                const groups = data.map((data) => data.Group);

                const numWithDementia = groups.reduce((count, group) => count + group, 0);
                const totalParticipants = groups.length;
                const dementiaRatio = numWithDementia / totalParticipants;

                const sexData = groups.map((group, index) => [group, sexes[index]]);
                const eduData = groups.map((group, index) => [group, edu[index]]);

                const ageRegression = ss.linearRegression([ages, groups]);
                const sexRegression = ss.linearRegression(sexData);
                const eduRegression = ss.linearRegression(eduData);

                ageSlope = ageRegression.m;
                ageIntercept = ageRegression.b;

                console.log("ageSlope: " + ageSlope);
                console.log("ageIntercept: " + ageIntercept);

                sexSlope = sexRegression.m; // The slope is 0, indicating no correlation from this dataset
                sexIntercept = sexRegression.b;

                console.log("sexSlope: " + sexSlope);
                console.log("sexIntercept: " + sexIntercept);

                eduSlope = eduRegression.m; // The slope is 0, indicating no correlation from this dataset
                eduIntercept = eduRegression.b;

                console.log("eduSlope: " + eduSlope);
                console.log("eduIntercept: " + eduIntercept);

                resolve([sexSlope, sexIntercept, eduSlope, eduIntercept, ageSlope, ageIntercept, dementiaRatio]);
            });
    });
}


async function calculateRisk(age, gender, educationLevel) {
    const results = await runAnalysis();
    const dementiaPrevelance = 55000000 / 8034000000;
    const percentOfDementiaBeingAlzheimers = 0.7;

    var risk = 0;
    var ageRisk = 0;
    var sexRisk = 0;
    var eduRisk = 0;

    if (results[0] != 0) {
        if (gender == 'M') {
            sexRisk = results[0] * 1 + results[1];
        } else {
            sexRisk = results[0] * 0 + results[1];
        }
        risk += sexRisk;
    }
    if (results[2] != 0) {
        eduRisk = results[2] * educationLevel + results[3];
        risk += eduRisk;
    }
    if (results[4] != 0) {
        ageRisk = results[4] * age + results[5];
        risk += ageRisk;
    }

    const adjustedRisk = (risk * dementiaPrevelance / results[6]) / percentOfDementiaBeingAlzheimers;
    console.log("risk: " + risk);
    console.log("adjustedRisk: " + adjustedRisk);
}
