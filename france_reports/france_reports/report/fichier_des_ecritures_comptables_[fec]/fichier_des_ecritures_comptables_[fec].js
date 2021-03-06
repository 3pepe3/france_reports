// Copyright (c) 2017, DOKOS and contributors
// For license information, please see license.txt
frappe.provide("frappe.views");
frappe.provide("frappe.tools");
frappe.provide("frappe.query_reports");

frappe.query_reports["Fichier des Ecritures Comptables [FEC]"] = {
    "filters": [
	{
	    "fieldname": "company",
	    "label": __("Company"),
	    "fieldtype": "Link",
	    "options": "Company",
	    "default": frappe.defaults.get_user_default("Company"),
	    "reqd": 1
	},
	{
	    "fieldname": "fiscal_year",
	    "label": __("Fiscal Year"),
	    "fieldtype": "Link",
	    "options": "Fiscal Year",
	    "default": frappe.defaults.get_user_default("fiscal_year"),
	    "reqd": 1,
	    "on_change": function(query_report) {
		var fiscal_year = query_report.get_values().fiscal_year;
		if (!fiscal_year) {
		    return;
		}
		frappe.model.with_doc("Fiscal Year", fiscal_year, function(r) {
		    var fy = frappe.model.get_doc("Fiscal Year", fiscal_year);
		    frappe.query_report_filters_by_name.from_date.set_input(fy.year_start_date);
		    frappe.query_report_filters_by_name.to_date.set_input(fy.year_end_date);
		    query_report.trigger_refresh();
		});
	    }
	}

    ],

    onload: function(query_report) {
	query_report.page.add_inner_button(__("Export"), function() {
	    var fiscal_year = query_report.get_values().fiscal_year;
	    var company = query_report.get_values().company;
		
	    frappe.call({
		method: "frappe.client.get_value",
		args: {
		    'doctype': "Company",
		    'fieldname': ['siren_number'],
		    'filters': {
			'name': company
		    }
		},
		callback: function(data) {
		    var company_data = data.message.siren_number;
		    if (company_data === null || company_data === undefined ) { msgprint(__("Please register the SIREN number in the company information file")) }
		    else {
			frappe.call({
			    method: "frappe.client.get_value",
			    args: {
				'doctype': "Fiscal Year",
				'fieldname': ['year_end_date'],
				'filters': {
				    'name': fiscal_year
				}
			    },
			    callback: function(data) {
				var fy = data.message.year_end_date;
				var title = company_data + "FEC" + moment(fy).format('YYYYMMDD');
				var result = $.map(frappe.slickgrid_tools.get_view_data(query_report.columns, query_report.dataView),
						   function(row) {
						       return [row.splice(1)];
						   });
				downloadify(result, null, title);
			    }
			});
			
		    }
		}
	    });
	    
	});
    }
}

var downloadify = function(data, roles, title) {
    if(roles && roles.length && !has_common(roles, roles)) {
	msgprint(__("Export not allowed. You need {0} role to export.", [frappe.utils.comma_or(roles)]));
	return;
    }

    var filename = title + ".csv";
    var csv_data = to_tab_csv(data);
    var a = document.createElement('a');

    if ("download" in a) {
	// Used Blob object, because it can handle large files
	var blob_object = new Blob([csv_data], { type: 'text/csv;charset=UTF-8' });
	a.href = URL.createObjectURL(blob_object);
	a.download = filename;

    } else {
	// use old method
	a.href = 'data:attachment/csv,' + encodeURIComponent(csv_data);
	a.download = filename;
	a.target = "_blank";
    }

    document.body.appendChild(a);
    a.click();

    document.body.removeChild(a);
};

var to_tab_csv = function(data) {
    var res = [];
    $.each(data, function(i, row) {
	row = $.map(row, function(col) {
	    return typeof(col)==="string" ? ('"' + col.replace(/"/g, '""') + '"') : col;
	});
	res.push(row.join("\t"));
    });
    return res.join("\n");
};
