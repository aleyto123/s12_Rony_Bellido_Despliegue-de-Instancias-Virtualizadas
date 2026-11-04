from locust import HttpUser, task, between
import uuid


class MundialUser(HttpUser):
    wait_time = between(1, 3)
    host = 'http://localhost:3001'

    def on_start(self):
        username = f'user_{uuid.uuid4().hex[:8]}'
        password = '123456'
        self.username = username
        self.password = password

        response = self.client.post('/api/auth/register', json={'username': username, 'password': password})
        if response.status_code == 201:
            self.token = response.json()['token']
        else:
            response = self.client.post('/api/auth/login', json={'username': username, 'password': password})
            self.token = response.json()['token']

    @task(3)
    def get_matches(self):
        self.client.get('/api/matches', headers={'Authorization': f'Bearer {self.token}'})

    @task(2)
    def get_leaderboard(self):
        self.client.get('/api/leaderboard/global', headers={'Authorization': f'Bearer {self.token}'})

    @task(1)
    def create_prediction(self):
        match_id = 1
        self.client.post(
            f'/api/matches/{match_id}/predictions',
            json={'home_score': 2, 'away_score': 1},
            headers={'Authorization': f'Bearer {self.token}'},
        )
