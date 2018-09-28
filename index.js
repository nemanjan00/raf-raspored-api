const request = require("request");

String.prototype.replaceAll = function(target, replacement) {
	return this.split(target).join(replacement);
};

const translationTable = {
	"Predmet": "subject",
	"Tip": "type",
	"Nastavnik": "professor",
	"Grupe": "groups", 
	"Dan": "day",
	"Termin": "time",
	"Učionica": "classroom"
};

const dayTranslationTable = [
	"PON",
	"UTO",
	"SRE",
	"ČET",
	"PET"
];

const structure = [
	"groups",
	"subject"
];

const scraper = {
	// Get content of parsed table
	_getData: () => {
		return new Promise((resolve, reject) => {
			request('https://rfidis.raf.edu.rs/raspored/', (error, response, body) => {
				console.log('error:', error);
				console.log('statusCode:', response && response.statusCode);

				if(error){
					reject(error);
				}

				let table = body.replaceAll("&nbsp", "").split("<table")[1];
				table = table.split("</table>")[0];

				table = {
					thead: table.split("<thead>")[1].split("</thead>")[0].trim(),
					tbody: table.split("<tbody>")[1].split("</tbody>")[0].trim()
				};

				// Cleanup head

				table.thead = table.thead.split("<tr")[1];
				table.thead = table.thead.split("<th>");
				table.thead.shift();

				table.thead = table.thead.map(data => data.trim());
				table.thead = table.thead.map(data => data.split("</th>")[0]);

				// Cleanup table

				table.tbody = table.tbody.split("<tr");
				table.tbody.shift();

				table.tbody = table.tbody.map((row) => {
					row = row.split("<td>");
					row.shift();

					row = row.map(data => data.trim());
					row = row.map(data => data.split("</td>")[0]);

					return row;
				});

				resolve(table);
			});
		});
	},

	// get data in better format
	getData: () => {
		return new Promise((resolve, reject) => {
			scraper._getData().then((table) => {
				// transform header to english

				table.thead = table.thead.map(field => translationTable[field] || field);

				// transform subjects from array to object
				table.tbody = table.tbody.map((subject) => {
					let subjectObject = {};

					subject.forEach((data, key) => {
						subjectObject[table.thead[key]] = data;
					});

					return subjectObject;
				});

				let subjects = table.tbody;

				// split groups
				subjects = subjects.map((subject) => {
					subject.groups = subject.groups.split(", ");

					return subject;
				});

				// split and normalize time (milirary time, for easier manipulation)
				subjects = subjects.map((subject) => {
					subject.time = {
						from: subject.time.split("-")[0].replaceAll(":", ""),
						to: subject.time.split("-")[1].replaceAll(":", "")
					}

					if(subject.time.from < 100){
						subject.time.from *= 100;
					}

					if(subject.time.to < 100){
						subject.time.to *= 100;
					}

					return subject;
				});

				// translate days
				subjects = subjects.map((subject) => {
					subject.day = dayTranslationTable.indexOf(subject.day) || -1;

					return subject;
				});

				resolve(subjects);
			}).catch(error => reject(error));
		});
	},

	restructure: (subjects) => {
		structure.forEach((data, key) => {
			subjects = scraper._restructure(subjects, key, data);
		});

		return subjects;
	},

	// function for restructuring to tree
	_restructure: (array, level, key) => {
		if(level == 0){
			let object = {};

			array.forEach((value) => {
				let group = value[key];

				if(group instanceof Array){
					group.forEach((group) => {
						if(object[group] === undefined){
							object[group] = [];
						}

						object[group].push(value);
					});
				} else {
					if(object[group] === undefined){
						object[group] = [];
					}

					object[group].push(value);
				}
			})

			return object;
		} else {
			Object.keys(array).forEach((arrayKey) => {
				array[arrayKey] = scraper._restructure(array[arrayKey], level - 1, key);
			});

			return array;
		}
	}
};

module.exports = scraper;

