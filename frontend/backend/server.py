from flask import Flask, request, jsonify
from flask_cors import CORS
import requests
from flask import Flask, jsonify
from flask_cors import CORS
import http.client
import ssl
import json
from flask import Flask, jsonify
import http.client
import ssl
from flask_cors import CORS

app = Flask(__name__)
CORS(app) 

API_TOKEN = "6653420429:jJSmds3a"
API_URL = "https://leakosintapi.com/"


OSINT_API_URL = "https://api.osint.industries/v2/request/stream"
OSINT_API_KEY = "3693040914a58ade3a56afecc20fdc6a"

OPENCORPORATES_API_URL = "https://api.opencorporates.com/v0.4/companies/search"
OPENCORPORATES_API_TOKEN = "Q6lhKi0G8WKv5rscoNox"


@app.route('/api/profile', methods=['POST'])
def get_profile():
    try:
        data = request.json
        phone_number = data.get('phone_number')

        if not phone_number:
            return jsonify({'error': 'Phone number is required'}), 400

        response = requests.post(
            API_URL,
            json={
                'token': API_TOKEN,
                'request': phone_number,
                'limit': 100,
                'lang': 'en'
            }
        )

        response.raise_for_status()

        return jsonify(response.json())

    except requests.exceptions.RequestException as e:
        return jsonify({'error': f'API request failed: {str(e)}'}), 500
    except Exception as e:
        return jsonify({'error': f'Server error: {str(e)}'}), 500


# Server 2
@app.route('/api/company/<domain>', methods=['GET'])
def get_company_data(domain):
    try:
        context = ssl._create_unverified_context()
        conn = http.client.HTTPSConnection("b2b-company-data-enrichment1.p.rapidapi.com", context=context)

        headers = {
            'x-rapidapi-key': "Izk7uHBUVcmshQqKrqmko9WywG6Fp12gmsajsnDzGBPAODILlb",
            'x-rapidapi-host': "b2b-company-data-enrichment1.p.rapidapi.com"
        }

        conn.request("GET", f"/companies/enrich?domain={domain}", headers=headers)

        res = conn.getresponse()
        data = json.loads(res.read().decode("utf-8"))

        return jsonify(data)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# Server 3
@app.route('/validate/<phone_number>')
def validate_phone(phone_number):
    context = ssl._create_unverified_context()
    conn = http.client.HTTPSConnection("checkthatphone.p.rapidapi.com", context=context)

    headers = {
        'x-rapidapi-key': "Izk7uHBUVcmshQqKrqmko9WywG6Fp12gmsajsnDzGBPAODILlb",
        'x-rapidapi-host': "checkthatphone.p.rapidapi.com",
        'Content-Type': "application/json"
    }

    conn.request("GET", f"/api?subscriber={phone_number}", headers=headers)

    res = conn.getresponse()
    data = res.read()

    return data.decode("utf-8")

@app.route('/api2/search2/<email>', methods=['GET'])
def search_email2(email):
    try:
        params = {
            "type": "email",
            "query": email,
            "timeout": 60
        }

        headers = {
            "accept": "application/json",
            "api-key": OSINT_API_KEY
        }

        response = requests.get(OSINT_API_URL, params=params, headers=headers)

        all_data = []
        for line in response.text.split('\n'):
            if line.startswith('data:'):
                try:
                    data = json.loads(line[5:])
                    
                    if data.get('data'):
                        
                        module_data = {
                            'module': data.get('module'),
                            'data': data.get('data')
                        }
                        all_data.append(module_data)
                        
                except json.JSONDecodeError:
                    continue

        return jsonify({
            'status': 'success',
            'data': all_data
        })

    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500


@app.route('/api/search/<email>', methods=['GET'])
def search_email(email):
    try:
        params = {
            "type": "email",
            "query": email,
            "timeout": 60
        }

        headers = {
            "accept": "application/json",
            "api-key": OSINT_API_KEY
        }

        response = requests.get(OSINT_API_URL, params=params, headers=headers)

        business_data = []
        for line in response.text.split('\n'):
            if line.startswith('data:'):
                try:
                    data = json.loads(line[5:])

                    if data.get('module') == 'yelp' and data.get('data', {}).get('business_list'):
                        for business in data['data']['business_list']:

                            business_info = {
                                'name': business.get('name'),
                                'coordinates': [
                                    business.get('longitude'),
                                    business.get('latitude')
                                ],
                                'address': business.get('addresses', {}).get('primary_language', {}).get('long_form'),
                                'rating': business.get('avg_rating'),
                                'review_count': business.get('review_count'),
                                'categories': [cat['name'] for cat in business.get('categories', [])],
                                'phone': business.get('localized_phone'),
                                'reviews': []
                            }

                            if 'review_list' in data['data']:
                                for review in data['data']['review_list']:
                                    if review['business_id'] == business['id']:
                                        business_info['reviews'].append({
                                            'rating': review['rating'],
                                            'text': review['text'],
                                            'user_name': review['user_name'],
                                            'time_modified': review['time_modified']
                                        })

                            business_data.append(business_info)
                except json.JSONDecodeError:
                    continue

        return jsonify({
            'status': 'success',
            'data': business_data
        })

    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@app.route('/api/opencorporates/<company_name>', methods=['GET'])
def get_opencorporates_data(company_name):
    try:
        formatted_company = company_name.replace(' ', '+')
        
        params = {
            'q': formatted_company,
            'jurisdiction_code': 'gb',  
            'api_token': OPENCORPORATES_API_TOKEN
        }
        
        response = requests.get(OPENCORPORATES_API_URL, params=params)
        response.raise_for_status()
        
        data = response.json()
        
        if data.get('results', {}).get('companies') and len(data['results']['companies']) > 0:
            return jsonify({
                'status': 'success',
                'data': data['results']['companies'][0]
            })
        else:
            return jsonify({
                'status': 'success',
                'data': None,
                'message': 'No company found'
            })
            
    except requests.exceptions.RequestException as e:
        return jsonify({
            'status': 'error',
            'message': f'API request failed: {str(e)}'
        }), 500
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': f'Server error: {str(e)}'
        }), 500


@app.route('/api/property/search', methods=['GET'])
def search_property():
    try:
        address1 = request.args.get('address1')
        address2 = request.args.get('address2')
        
        if not address1 or not address2:
            return jsonify({
                'status': 'error',
                'message': 'Both address1 and address2 parameters are required'
            }), 400
            
        url = "https://api.gateway.attomdata.com/propertyapi/v1.0.0/property/basicprofile"
        
        params = {
            "address1": address1,
            "address2": address2
        }

        headers = {
            "accept": "application/json",
            "apikey": "9c82d330e213de3af7bd72cb053f78df"
        }
        
        response = requests.get(url, params=params, headers=headers)
        response.raise_for_status()
        
        return jsonify(response.json())
        
    except requests.exceptions.RequestException as e:
        return jsonify({
            'status': 'error',
            'message': f'API request failed: {str(e)}'
        }), 500
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': f'Server error: {str(e)}'
        }), 500
@app.route('/api/company-details/<jurisdiction_code>/<company_number>', methods=['GET'])
def get_company_details(jurisdiction_code, company_number):
    try:

        base_url = f"https://api.opencorporates.com/v0.4/companies/{jurisdiction_code}/{company_number}"
        
        params = {
            'api_token': OPENCORPORATES_API_TOKEN
        }
        
        response = requests.get(base_url, params=params)
        response.raise_for_status()
        
        return jsonify(response.json())
            
    except requests.exceptions.RequestException as e:
        return jsonify({
            'status': 'error',
            'message': f'API request failed: {str(e)}'
        }), 500
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': f'Server error: {str(e)}'
        }), 500
        
@app.route('/api/email/osint', methods=['POST'])
def email_osint_lookup():
    try:

        data = request.json
        email = data.get('email')

        if not email:
            return jsonify({'error': 'Email is required'}), 400

        osint_data = {
            "token": "6653420429:jJSmds3a",
            "request": email,
            "limit": 100,
            "lang": "en"
        }


        response = requests.post('https://leakosintapi.com/', json=osint_data)
        response.raise_for_status()
        return jsonify(response.json())

    except requests.exceptions.RequestException as e:
        return jsonify({'error': f'API request failed: {str(e)}'}), 500
    except Exception as e:
        return jsonify({'error': f'Server error: {str(e)}'}), 500

@app.route('/api/phone/osint', methods=['GET'])
def phone_osint_lookup():
    try:
        phone_number = request.args.get('phone', '')

        if not phone_number:
            return jsonify({'error': 'Phone number is required'}), 400

        params = {
            "type": "phone",
            "query": phone_number,
            "timeout": 60
        }

        headers = {
            "accept": "application/json",
            "api-key": OSINT_API_KEY
        }

        response = requests.get(OSINT_API_URL, params=params, headers=headers)

        all_data = []
        for line in response.text.split('\n'):
            if line.startswith('data:'):
                try:
                    data = json.loads(line[5:])
                    
                    if data.get('data'):
                        module_data = {
                            'module': data.get('module'),
                            'category': data.get('category'),
                            'data': data.get('data'),
                            'status': data.get('status')
                        }
                        all_data.append(module_data)
                        
                except json.JSONDecodeError:
                    continue

        return jsonify({
            'status': 'success',
            'data': all_data
        })

    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@app.route('/fetch_user_data', methods=['GET'])
def fetch_user_data():
    # The static parameters as specified
    params = {
        'criteria': 'email',
        'email': 'smocker600@gmail.com'
    }
    
    # The API endpoint
    api_url = 'http://144.172.92.117:8080/start_scrapy'
    
    try:
        # Make the request to the external API
        response = requests.get(api_url, params=params)
        
        # Check if request was successful
        if response.status_code == 200:
            # Return the JSON data from the API
            return jsonify(response.json())
        else:
            # Return error if the API request failed
            return jsonify({
                'error': f'API request failed with status code {response.status_code}',
                'message': 'Unable to fetch data from the external API'
            }), 500
            
    except requests.RequestException as e:
        # Handle any exceptions that occur during the request
        return jsonify({
            'error': 'Request Exception',
            'message': str(e)
        }), 500

@app.route('/fetch_phone_data', methods=['GET'])
def fetch_phone_data():
    # Get phone number from query parameters, default to a sample if not provided
    phone_number = request.args.get('phone', '9177839188')
    
    # The parameters to be sent to the API
    params = {
        'criteria': 'phone',
        'phone': phone_number
    }
    
    # The API endpoint
    api_url = 'http://144.172.92.117:8080/start_scrapy'
    
    try:
        # Make the request to the external API
        response = requests.get(api_url, params=params)
        
        # Check if request was successful
        if response.status_code == 200:
            # Return the JSON data from the API
            return jsonify(response.json())
        else:
            # Return error if the API request failed
            return jsonify({
                'error': f'API request failed with status code {response.status_code}',
                'message': 'Unable to fetch data from the external API'
            }), 500
            
    except requests.RequestException as e:
        # Handle any exceptions that occur during the request
        return jsonify({
            'error': 'Request Exception',
            'message': str(e)
        }), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)