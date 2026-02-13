import { BrowserRouter as Router, Switch, Route } from "react-router-dom";
import Dashboard from "./pages/dashboard";
import Audits from "./pages/audits";
import ModelManager from "./pages/model-manager";

export default function App() {
  return (
    <Router>
      <Switch>
        <Route exact path="/" component={Dashboard} />
        <Route exact path="/audits" component={Audits} />
        <Route exact path="/model-manager" component={ModelManager} />
      </Switch>
    </Router>
  );
}
