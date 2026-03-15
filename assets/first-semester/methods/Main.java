//CHAPTER 7- METHODS
//THEORY
  //A. METHODS- INTRODUCTION- RN
  
  class StaticMethods{
    public static int product(int a, int b){
      return a*b;
    }
  }
  
  
  class InstanceMethods{
    public int divide(int a, int b){
      return a/b;
    }
  }
  
  
  class MethodOverloading{
    public static void printValue(int a){
      System.out.println(a);
    }
    public static void printValue(int a, int b){
      System.out.println(a + " " + b);
    }
    public static void printValue(int a, int b, int c){
      System.out.println(a + " " + b + " " + c);
    }
  
  
    public static void tryme(int x){
      System.out.println(x);
    }
    public static void tryme(double x){
      System.out.println(x);
    }
    public static void tryme(double x, double y){
      System.out.println(x + " " + y);
    }
    public static void tryme(int x, int y){
      System.out.println(x + " " + y);
    } 
  }
  
  class PassingInJava{
    public static void swap(int a, int b){
      int temp = a;
      a = b;
      b = temp;
    }
  }
  
  
  public class Main {
    //B. DECALARTION AND COMPONENTS OF METHODS- RN
        public static void sum(int a, int b){  //Access Modifier -> Return Type -> Identifier -> Parameters Lists
          System.out.println(a+b);             //Method Body
        }
    
    public static void main(String[] args) {
    //C. METHODS SIGNATURE- RN
    //D. TYPES OF METHODS
    
      //I. PRE-DEFINED METHODS
        double a = 2;
        double b = Math.pow(2,2);
        //Note: This is pow() of Math Class. Here this method is being called. 
        //This method has been declared in Java Library. The type this method will return is double. 
        //And its a Static Method.
    
        String c = "Anshul Chaurasiya";
        String d = c.toUpperCase();
        //Note: This is toUpperCase() of String Class. The type this method will return is String.
        //And its a Static Method.
  
  
      
      //II. USER-DEFINED METHODS
        //1. Static Methods:
          int e = 1;
          int f = 8;
          System.out.println(StaticMethods.product(e, f));
          //Note: How it works internally, first when the method is called using dot operator by 
          //giving arguments which are copied here. Remember the reference is not passes but the 
          //value. Then it goes to StaticMethods class where the method product is present these 
          //value are analysed, then the method return the value from where it was called(the main 
          //method).
  
        //2. Instance Method:
        //Step-1: Create an object of InstanceMethod class(the class int which the method is 
        //present):
          InstanceMethods g = new InstanceMethods();
  
        //Step-2: Using dot operator with object we call the function:
          System.out.println(g.divide(10, 2)); 
  
    //E. METHOD OVERLOADING
          MethodOverloading.printValue(2);
          MethodOverloading.printValue(2, 3);
          MethodOverloading.printValue(2, 3, 4);
  
          MethodOverloading.tryme(1); 
          MethodOverloading.tryme(1.0);
          MethodOverloading.tryme(1.0, 2);  //Output: 1.0 2.0- ATC
          MethodOverloading.tryme(1, 2);
  
      
    //F. PASS BY VALUE
      int h = 3;
      int i = 4;
      PassingInJava.swap(h, i);
      System.out.println(h + " " + i);
      //Note: Here the values copy has been made which is passed to the method as formal 
      //variables where aletration has been done to formal arguments but not to the actual 
      //arguments.
  
    //G. MAIN METHOD- RN
    //H. RETURN STATEMENT- RN
      
      
  
  //EXERCISES
    //EXERCISE-1- RPDF
  
  
  
  
  
  
      
    }
  }
