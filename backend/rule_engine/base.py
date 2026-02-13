class RuleResult:
    def __init__(self, rule_id, category, severity, description):
        self.rule_id = rule_id
        self.category = category
        self.severity = severity
        self.description = description


class BaseRule:
    rule_id = None
    category = None

    def evaluate(self, prompt: str, response: dict):
        raise NotImplementedError
