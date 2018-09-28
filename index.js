const request = require("request");

String.prototype.replaceAll = function(target, replacement) {
	return this.split(target).join(replacement);
};

const scraper = {
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
	}
}

scraper._getData().then((table) => {
	console.log(table);
});

