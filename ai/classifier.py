import sys
import json

class SeverityClassifier:
    def predict_severity(self, data):
        """
        Rule-based AI severity classification.
        data dict should contain:
        - emergency_type (str)
        - description (str)
        - num_victims (int)
        - is_trapped (bool)
        - is_injured (bool)
        - is_fire (bool)
        """
        score = 3
        reasons = []

        # Base score by emergency type
        em_type = data.get('emergency_type', '').upper()
        if 'EARTHQUAKE' in em_type or 'COLLAPSE' in em_type:
            score += 2
            reasons.append("Structural collapse/earthquake risk")
        elif 'FIRE' in em_type:
            score += 2
            reasons.append("Fire emergency")
        elif 'FLOOD' in em_type:
            score += 1
            reasons.append("Flood emergency")

        # Context flags
        if data.get('is_trapped'):
            score += 3
            reasons.append("Victim reported trapped")
        if data.get('is_injured'):
            score += 2
            reasons.append("Victim reported injuries")
        if data.get('is_fire'):
            if "Fire emergency" not in reasons:
                score += 2
                reasons.append("Active fire reported")
        
        num_victims = data.get('num_victims', 1)
        if num_victims > 5:
            score += 2
            reasons.append(f"Multiple victims ({num_victims})")
        elif num_victims > 1:
            score += 1
            reasons.append("Multiple victims")

        # Description keywords
        desc = data.get('description', '').lower()
        if 'bleeding' in desc or 'unconscious' in desc or 'heart' in desc:
            score += 2
            reasons.append("Critical medical keywords in description")
        if 'water' in desc and 'rising' in desc:
            score += 1
            reasons.append("Rising water levels")

        # Cap score at 10
        score = min(score, 10)

        # Determine level
        if score <= 3:
            level = 'LOW'
        elif score <= 6:
            level = 'MEDIUM'
        elif score <= 8:
            level = 'HIGH'
        else:
            level = 'CRITICAL'

        if not reasons:
            reasons.append("Standard emergency response required")

        return {
            "severity_score": score,
            "severity_level": level,
            "reasons": reasons
        }

if __name__ == "__main__":
    if len(sys.argv) > 1:
        try:
            input_data = json.loads(sys.argv[1])
            classifier = SeverityClassifier()
            result = classifier.predict_severity(input_data)
            print(json.dumps(result))
        except Exception as e:
            print(json.dumps({
                "severity_score": 5, 
                "severity_level": "MEDIUM", 
                "reasons": ["Error evaluating severity", str(e)]
            }))
    else:
        # Default test
        classifier = SeverityClassifier()
        test_data = {
            "emergency_type": "FIRE",
            "is_trapped": True,
            "is_injured": False,
            "num_victims": 3,
            "description": "Smoke filling the room"
        }
        print(json.dumps(classifier.predict_severity(test_data), indent=2))
